import { describe, it, expect, beforeEach } from 'vitest';
import { resetRegistry, listCapabilities, listCommands, findCommand, registerCapability, unregisterCapability } from '../../registry';
import type { CapabilityManifest, CommandHandler } from '../../registry/types';

// Import the actual registration functions (not side-effect modules)
// We need to test the registration works, not rely on module side effects
const storageManifest: CapabilityManifest = {
  id: 'storage',
  name: 'Storage',
  version: '1.0.0',
  description: 'Virtual file system operations',
  permissions: [{ scope: 'storage', description: 'Read/write VFS' }],
  commands: [
    { id: 'read', label: 'Read File', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'write', label: 'Write File', params: { path: { type: 'string', required: true }, content: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'delete', label: 'Delete', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'list', label: 'List', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'exists', label: 'Exists', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'mkdir', label: 'Mkdir', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'stat', label: 'Stat', params: { path: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'move', label: 'Move', params: { from: { type: 'string', required: true }, to: { type: 'string', required: true } }, permission: 'storage' },
    { id: 'copy', label: 'Copy', params: { from: { type: 'string', required: true }, to: { type: 'string', required: true } }, permission: 'storage' },
  ],
};

const storageHandlers: Record<string, CommandHandler> = {
  read: () => 'file content',
  write: () => undefined,
  delete: () => undefined,
  list: () => [],
  exists: () => true,
  mkdir: () => undefined,
  stat: () => null,
  move: () => undefined,
  copy: () => undefined,
};

const clipboardManifest: CapabilityManifest = {
  id: 'clipboard',
  name: 'Clipboard',
  version: '1.0.0',
  permissions: [{ scope: 'clipboard', description: 'System clipboard' }],
  commands: [
    { id: 'read', label: 'Read', permission: 'clipboard' },
    { id: 'write', label: 'Write', permission: 'clipboard' },
    { id: 'clear', label: 'Clear', permission: 'clipboard' },
  ],
};

const clipboardHandlers: Record<string, CommandHandler> = {
  read: () => '',
  write: () => true,
  clear: () => true,
};

const notificationManifest: CapabilityManifest = {
  id: 'notification',
  name: 'Notifications',
  version: '1.0.0',
  permissions: [{ scope: 'notification', description: 'Show notifications' }],
  commands: [
    { id: 'send', label: 'Send', params: { title: { type: 'string', required: true } }, permission: 'notification' },
    { id: 'dismiss', label: 'Dismiss', params: { id: { type: 'string', required: true } }, permission: 'notification' },
    { id: 'clearAll', label: 'Clear All', permission: 'notification' },
  ],
};

const notificationHandlers: Record<string, CommandHandler> = {
  send: () => 'notif-1',
  dismiss: () => true,
  clearAll: () => true,
};

const windowManifest: CapabilityManifest = {
  id: 'window',
  name: 'Window Manager',
  version: '1.0.0',
  permissions: [{ scope: 'window', description: 'Manage windows' }],
  commands: [
    { id: 'open', label: 'Open', params: { appId: { type: 'string', required: true } }, permission: 'window' },
    { id: 'close', label: 'Close', params: { windowId: { type: 'string', required: true } }, permission: 'window' },
    { id: 'focus', label: 'Focus', params: { windowId: { type: 'string', required: true } }, permission: 'window' },
    { id: 'minimize', label: 'Minimize', params: { windowId: { type: 'string', required: true } }, permission: 'window' },
    { id: 'maximize', label: 'Maximize', params: { windowId: { type: 'string', required: true } }, permission: 'window' },
  ],
};

const windowHandlers: Record<string, CommandHandler> = {
  open: () => 'window-1',
  close: () => true,
  focus: () => true,
  minimize: () => true,
  maximize: () => true,
};

beforeEach(() => {
  resetRegistry();
});

describe('Capability registration', () => {
  it('should register storage capability with 9 commands', () => {
    registerCapability(storageManifest, storageHandlers);
    const caps = listCapabilities();
    const storage = caps.find((c) => c.id === 'storage');
    expect(storage).toBeDefined();
    expect(storage!.commands).toHaveLength(9);
  });

  it('should register clipboard capability with 3 commands', () => {
    registerCapability(clipboardManifest, clipboardHandlers);
    const caps = listCapabilities();
    const clipboard = caps.find((c) => c.id === 'clipboard');
    expect(clipboard).toBeDefined();
    expect(clipboard!.commands).toHaveLength(3);
  });

  it('should register notification capability with 3 commands', () => {
    registerCapability(notificationManifest, notificationHandlers);
    const caps = listCapabilities();
    const notif = caps.find((c) => c.id === 'notification');
    expect(notif).toBeDefined();
    expect(notif!.commands).toHaveLength(3);
  });

  it('should register window capability with 5 commands', () => {
    registerCapability(windowManifest, windowHandlers);
    const caps = listCapabilities();
    const win = caps.find((c) => c.id === 'window');
    expect(win).toBeDefined();
    expect(win!.commands).toHaveLength(5);
  });

  it('should list all commands across capabilities', () => {
    registerCapability(storageManifest, storageHandlers);
    registerCapability(clipboardManifest, clipboardHandlers);
    registerCapability(notificationManifest, notificationHandlers);
    registerCapability(windowManifest, windowHandlers);
    const cmds = listCommands();
    expect(cmds.length).toBe(9 + 3 + 3 + 5);
  });

  it('should find commands by namespaced ID', () => {
    registerCapability(storageManifest, storageHandlers);
    const result = findCommand('storage.read');
    expect(result).not.toBeNull();
    expect(result!.capabilityId).toBe('storage');
    expect(result!.schema.id).toBe('read');
  });

  it('should find commands by flat ID', () => {
    registerCapability(storageManifest, storageHandlers);
    registerCapability(clipboardManifest, clipboardHandlers);
    // "read" exists in both — first match (storage) wins since it's iterated first
    const result = findCommand('read');
    expect(result).not.toBeNull();
  });

  it('should reject duplicate capability registration', () => {
    registerCapability(storageManifest, storageHandlers);
    expect(() => registerCapability(storageManifest, storageHandlers)).toThrow('already registered');
  });

  it('should reject handler for unknown command', () => {
    const badManifest: CapabilityManifest = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      permissions: [],
      commands: [{ id: 'foo', label: 'Foo' }],
    };
    expect(() => registerCapability(badManifest, { bar: () => null })).toThrow('unknown command');
  });

  it('should allow unregistering capabilities', () => {
    registerCapability(storageManifest, storageHandlers);
    expect(listCapabilities()).toHaveLength(1);
    unregisterCapability('storage');
    expect(listCapabilities()).toHaveLength(0);
  });
});
