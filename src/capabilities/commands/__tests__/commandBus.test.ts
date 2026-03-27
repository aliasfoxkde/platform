import { describe, it, expect, beforeEach } from 'vitest';
import {
  execute,
  subscribe,
  getHistory,
  getHistoryIndex,
  undo,
  redo,
  canUndo,
  canRedo,
  attachUndo,
  resetCommandBus,
} from '../commandBus';
import { registerCapability, resetRegistry } from '../../registry/registry';
import type { CapabilityManifest } from '../../registry/types';

const testManifest: CapabilityManifest = {
  id: 'math',
  name: 'Math',
  version: '1.0.0',
  permissions: [],
  commands: [
    {
      id: 'add',
      label: 'Add',
      params: {
        a: { type: 'number', required: true },
        b: { type: 'number', required: true },
      },
    },
    {
      id: 'fail',
      label: 'Fail',
    },
  ],
};

const testHandlers = {
  add: (params: Record<string, unknown>) => (params.a as number) + (params.b as number),
  fail: () => {
    throw new Error('intentional failure');
  },
};

beforeEach(() => {
  resetRegistry();
  resetCommandBus();
  registerCapability(testManifest, testHandlers);
});

describe('execute', () => {
  it('executes a command by namespaced ID and returns result', async () => {
    const result = await execute('math.add', { a: 2, b: 3 });
    expect(result.ok).toBe(true);
    expect(result.data).toBe(5);
    expect(result.commandId).toBe('math.add');
    expect(result.executionId).toBeTruthy();
  });

  it('executes a command by flat ID', async () => {
    const result = await execute('add', { a: 10, b: 20 });
    expect(result.ok).toBe(true);
    expect(result.data).toBe(30);
  });

  it('returns error for unknown command', async () => {
    const result = await execute('nonexistent.command');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error when handler throws', async () => {
    const result = await execute('math.fail');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('intentional failure');
  });

  it('records duration', async () => {
    const result = await execute('math.add', { a: 1, b: 1 });
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('records source in execution', async () => {
    const result = await execute('math.add', { a: 1, b: 1 }, 'keyboard');
    expect(result.ok).toBe(true);
    // Verify through history
    const hist = getHistory();
    expect(hist[hist.length - 1].payload.source).toBe('keyboard');
  });

  it('supports async handlers', async () => {
    const asyncManifest: CapabilityManifest = {
      id: 'async-cap',
      name: 'Async',
      version: '1.0.0',
      permissions: [],
      commands: [{ id: 'wait', label: 'Wait' }],
    };
    registerCapability(asyncManifest, {
      wait: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return 'done';
      },
    });
    const result = await execute('async-cap.wait');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('done');
  });
});

describe('subscribe', () => {
  it('receives before-execute event', async () => {
    const events: import('../types').CommandBusEvent[] = [];
    subscribe((event) => events.push(event));
    await execute('math.add', { a: 1, b: 1 });
    expect(events.some((e) => e.type === 'before-execute')).toBe(true);
  });

  it('receives after-execute event on success', async () => {
    const events: import('../types').CommandBusEvent[] = [];
    subscribe((event) => events.push(event));
    await execute('math.add', { a: 1, b: 1 });
    const afterEvent = events.find((e) => e.type === 'after-execute');
    expect(afterEvent).toBeDefined();
    expect(afterEvent!.result!.ok).toBe(true);
  });

  it('receives error event on failure', async () => {
    const events: import('../types').CommandBusEvent[] = [];
    subscribe((event) => events.push(event));
    await execute('math.fail');
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  it('unsubscribe stops receiving events', async () => {
    const events: import('../types').CommandBusEvent[] = [];
    const unsub = subscribe((event) => events.push(event));
    unsub();
    await execute('math.add', { a: 1, b: 1 });
    expect(events).toHaveLength(0);
  });

  it('listener errors do not disrupt execution', async () => {
    subscribe(() => {
      throw new Error('listener error');
    });
    const result = await execute('math.add', { a: 1, b: 1 });
    expect(result.ok).toBe(true);
  });
});

describe('history', () => {
  it('records successful commands in history', async () => {
    await execute('math.add', { a: 1, b: 2 });
    await execute('math.add', { a: 3, b: 4 });
    expect(getHistory()).toHaveLength(2);
    expect(getHistoryIndex()).toBe(1);
  });

  it('does not record failed commands in history', async () => {
    await execute('math.add', { a: 1, b: 2 });
    await execute('math.fail');
    expect(getHistory()).toHaveLength(1);
  });

  it('does not record not-found commands in history', async () => {
    await execute('nonexistent');
    expect(getHistory()).toHaveLength(0);
  });

  it('truncates redo entries on new execution', async () => {
    const r1 = await execute('math.add', { a: 1, b: 1 });
    const r2 = await execute('math.add', { a: 2, b: 2 });
    attachUndo(r2.executionId, () => {});
    attachUndo(r1.executionId, () => {});
    // Undo once
    await undo();
    expect(getHistoryIndex()).toBe(0);
    // Execute new — should truncate the redo entry
    await execute('math.add', { a: 3, b: 3 });
    expect(getHistory()).toHaveLength(2);
    expect(getHistoryIndex()).toBe(1);
  });

  it('caps history at 100 entries', async () => {
    // Add 101 entries
    for (let i = 0; i < 101; i++) {
      await execute('math.add', { a: i, b: i });
    }
    expect(getHistory()).toHaveLength(100);
  });
});

describe('undo / redo', () => {
  it('undo returns null when no undoable entries', async () => {
    await execute('math.add', { a: 1, b: 2 });
    expect(await undo()).toBeNull();
  });

  it('canUndo / canRedo reflect state', async () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('undo calls the undo function and returns entry', async () => {
    await execute('math.add', { a: 1, b: 2 });
    const result = await execute('math.add', { a: 3, b: 4 });
    attachUndo(result.executionId, () => {});
    expect(canUndo()).toBe(true);

    const undone = await undo();
    expect(undone).not.toBeNull();
    expect(undone!.result.data).toBe(7);
    expect(getHistoryIndex()).toBe(0);
  });

  it('redo re-executes the command', async () => {
    const r1 = await execute('math.add', { a: 1, b: 2 });
    const r2 = await execute('math.add', { a: 3, b: 4 });
    attachUndo(r2.executionId, () => {});
    attachUndo(r1.executionId, () => {});

    await undo();
    expect(canRedo()).toBe(true);

    const redone = await redo();
    expect(redone).not.toBeNull();
    expect(redone!.result.data).toBe(7);
    expect(getHistoryIndex()).toBe(1);
  });

  it('redo returns null when nothing to redo', async () => {
    expect(await redo()).toBeNull();
  });

  it('undo skips entries without undo function', async () => {
    await execute('math.add', { a: 1, b: 2 }); // no undo
    const r2 = await execute('math.add', { a: 3, b: 4 });
    attachUndo(r2.executionId, () => {});

    const undone = await undo();
    expect(undone).not.toBeNull();
    expect(undone!.result.data).toBe(7);
    // Should skip the first entry (no undo)
    expect(canUndo()).toBe(false);
  });

  it('attachUndo returns false for unknown execution ID', () => {
    expect(attachUndo('nonexistent', () => {})).toBe(false);
  });
});

describe('resetCommandBus', () => {
  it('clears history and listeners', async () => {
    const events: import('../types').CommandBusEvent[] = [];
    subscribe((event) => events.push(event));
    await execute('math.add', { a: 1, b: 2 });
    expect(getHistory()).toHaveLength(1);

    resetCommandBus();
    expect(getHistory()).toHaveLength(0);
    expect(getHistoryIndex()).toBe(-1);

    // Listener should be gone — no new events after reset
    const countBefore = events.length;
    await execute('math.add', { a: 3, b: 4 });
    expect(events.length).toBe(countBefore);
  });
});
