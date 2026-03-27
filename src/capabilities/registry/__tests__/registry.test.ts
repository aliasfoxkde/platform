import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCapability,
  unregisterCapability,
  getCapability,
  listCapabilities,
  findCommand,
  listCommands,
  setCapabilityEnabled,
  setPermissionHandler,
  hasPermission,
  setPermission,
  requestPermission,
  resetRegistry,
} from '../registry';
import type { CapabilityManifest } from '../types';

const testManifest: CapabilityManifest = {
  id: 'test-cap',
  name: 'Test Capability',
  version: '1.0.0',
  description: 'A test capability',
  permissions: [
    { scope: 'storage', description: 'Read files' },
    { scope: 'network', description: 'Make requests' },
  ],
  commands: [
    {
      id: 'run',
      label: 'Run',
      description: 'Run something',
      params: {
        input: { type: 'string', description: 'Input text', required: true },
      },
    },
    {
      id: 'stop',
      label: 'Stop',
      permission: 'storage',
    },
  ],
};

const testHandlers = {
  run: (params: Record<string, unknown>) => `ran: ${params.input}`,
  stop: () => 'stopped',
};

beforeEach(() => {
  resetRegistry();
});

describe('registerCapability', () => {
  it('registers a capability with handlers', () => {
    registerCapability(testManifest, testHandlers);
    const cap = getCapability('test-cap');
    expect(cap).toBeDefined();
    expect(cap!.name).toBe('Test Capability');
    expect(cap!.version).toBe('1.0.0');
    expect(cap!.handlers.get('run')).toBe(testHandlers.run);
    expect(cap!.enabled).toBe(true);
  });

  it('throws on duplicate registration', () => {
    registerCapability(testManifest, testHandlers);
    expect(() => registerCapability(testManifest, testHandlers)).toThrow(
      'already registered',
    );
  });

  it('throws on unknown handler command', () => {
    const badManifest: CapabilityManifest = {
      ...testManifest,
      commands: [{ id: 'run', label: 'Run' }],
    };
    expect(() =>
      registerCapability(badManifest, { nonexistent: () => {} }),
    ).toThrow('unknown command');
  });
});

describe('unregisterCapability', () => {
  it('removes a registered capability', () => {
    registerCapability(testManifest, testHandlers);
    expect(unregisterCapability('test-cap')).toBe(true);
    expect(getCapability('test-cap')).toBeUndefined();
  });

  it('returns false for unknown capability', () => {
    expect(unregisterCapability('nonexistent')).toBe(false);
  });
});

describe('listCapabilities', () => {
  it('lists all registered capabilities', () => {
    registerCapability(testManifest, testHandlers);
    const cap2: CapabilityManifest = {
      id: 'cap-2',
      name: 'Second',
      version: '0.1.0',
      permissions: [],
      commands: [{ id: 'do', label: 'Do' }],
    };
    registerCapability(cap2, { do: () => 'done' });
    expect(listCapabilities()).toHaveLength(2);
  });

  it('returns empty array when none registered', () => {
    expect(listCapabilities()).toEqual([]);
  });
});

describe('findCommand', () => {
  it('finds a command by namespaced ID', () => {
    registerCapability(testManifest, testHandlers);
    const found = findCommand('test-cap.run');
    expect(found).not.toBeNull();
    expect(found!.capabilityId).toBe('test-cap');
    expect(found!.schema.id).toBe('run');
  });

  it('finds a command by flat ID', () => {
    registerCapability(testManifest, testHandlers);
    const found = findCommand('run');
    expect(found).not.toBeNull();
    expect(found!.handler).toBe(testHandlers.run);
  });

  it('returns null for unknown command', () => {
    expect(findCommand('nonexistent')).toBeNull();
  });

  it('returns null for unknown capability prefix', () => {
    registerCapability(testManifest, testHandlers);
    expect(findCommand('wrong.run')).toBeNull();
  });
});

describe('listCommands', () => {
  it('lists all commands across capabilities', () => {
    registerCapability(testManifest, testHandlers);
    const commands = listCommands();
    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.schema.id)).toEqual(['run', 'stop']);
  });

  it('includes capability ID for each command', () => {
    registerCapability(testManifest, testHandlers);
    const commands = listCommands();
    expect(commands[0].capabilityId).toBe('test-cap');
  });
});

describe('setCapabilityEnabled', () => {
  it('disables a capability', () => {
    registerCapability(testManifest, testHandlers);
    expect(setCapabilityEnabled('test-cap', false)).toBe(true);
    expect(getCapability('test-cap')!.enabled).toBe(false);
  });

  it('re-enables a capability', () => {
    registerCapability(testManifest, testHandlers);
    setCapabilityEnabled('test-cap', false);
    setCapabilityEnabled('test-cap', true);
    expect(getCapability('test-cap')!.enabled).toBe(true);
  });

  it('returns false for unknown capability', () => {
    expect(setCapabilityEnabled('nonexistent', true)).toBe(false);
  });
});

describe('permissions', () => {
  it('starts with no permissions granted', () => {
    registerCapability(testManifest, testHandlers);
    expect(hasPermission('test-cap', 'storage')).toBe(false);
    expect(hasPermission('test-cap', 'network')).toBe(false);
  });

  it('grants and revokes permissions', () => {
    registerCapability(testManifest, testHandlers);
    setPermission('test-cap', 'storage', true);
    expect(hasPermission('test-cap', 'storage')).toBe(true);
    setPermission('test-cap', 'storage', false);
    expect(hasPermission('test-cap', 'storage')).toBe(false);
  });

  it('requestPermission resolves immediately if already granted', async () => {
    registerCapability(testManifest, testHandlers);
    setPermission('test-cap', 'storage', true);
    const result = await requestPermission('test-cap', 'storage');
    expect(result).toBe('granted');
  });

  it('requestPermission auto-grants when no handler is set', async () => {
    registerCapability(testManifest, testHandlers);
    const result = await requestPermission('test-cap', 'storage');
    expect(result).toBe('granted');
    expect(hasPermission('test-cap', 'storage')).toBe(true);
  });

  it('requestPermission calls the handler and resolves on grant', async () => {
    registerCapability(testManifest, testHandlers);

    let capturedRequest: import('../types').PermissionRequest | null = null;
    setPermissionHandler((request) => {
      capturedRequest = request;
      request.resolve('granted');
    });

    const result = await requestPermission('test-cap', 'network');
    expect(result).toBe('granted');
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.capabilityId).toBe('test-cap');
    expect(capturedRequest!.permission.scope).toBe('network');
  });

  it('requestPermission resolves denied when handler denies', async () => {
    registerCapability(testManifest, testHandlers);

    setPermissionHandler((request) => {
      request.resolve('denied');
    });

    const result = await requestPermission('test-cap', 'network');
    expect(result).toBe('denied');
    expect(hasPermission('test-cap', 'network')).toBe(false);
  });

  it('requestPermission returns denied for unknown capability', async () => {
    const result = await requestPermission('nonexistent', 'storage');
    expect(result).toBe('denied');
  });

  it('requestPermission returns denied for unknown permission scope', async () => {
    registerCapability(testManifest, testHandlers);
    const result = await requestPermission('test-cap', 'geolocation' as 'storage');
    expect(result).toBe('denied');
  });

  it('setPermissionHandler can be cleared', async () => {
    registerCapability(testManifest, testHandlers);
    setPermissionHandler((request) => request.resolve('granted'));
    setPermissionHandler(null);
    // Should auto-grant now
    const result = await requestPermission('test-cap', 'network');
    expect(result).toBe('granted');
  });
});

describe('resetRegistry', () => {
  it('clears all state', () => {
    registerCapability(testManifest, testHandlers);
    setPermission('test-cap', 'storage', true);
    resetRegistry();
    expect(listCapabilities()).toEqual([]);
    expect(getCapability('test-cap')).toBeUndefined();
  });
});
