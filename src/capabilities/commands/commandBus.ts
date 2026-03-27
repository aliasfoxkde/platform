/**
 * Command Bus — central dispatch for all system commands.
 *
 * Provides:
 * - `execute()` — dispatch a command to the capability registry
 * - `subscribe()` — listen for command lifecycle events
 * - History tracking with undo/redo
 */

import { findCommand } from '../registry/registry';
import type {
  CommandBusEvent,
  CommandBusListener,
  CommandPayload,
  CommandResult,
  CommandSource,
  HistoryEntry,
  Unsubscribe,
} from './types';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const listeners = new Set<CommandBusListener>();
const history: HistoryEntry[] = [];
let historyIndex = -1;
let executionCounter = 0;

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function nextExecutionId(): string {
  executionCounter += 1;
  return `exec-${Date.now()}-${executionCounter}`;
}

// ---------------------------------------------------------------------------
// Subscribe / unsubscribe
// ---------------------------------------------------------------------------

/**
 * Subscribe to command bus events.
 * Returns an unsubscribe function.
 */
export function subscribe(listener: CommandBusListener): Unsubscribe {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Emit an event to all listeners. */
function emit(event: CommandBusEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Listener errors should not disrupt the bus
    }
  }
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

/**
 * Dispatch a command through the bus.
 *
 * The command is resolved against the capability registry, executed,
 * and the result is recorded in history.
 */
export async function execute(
  commandId: string,
  params: Record<string, unknown> = {},
  source: CommandSource = 'internal',
): Promise<CommandResult> {
  const executionId = nextExecutionId();
  const timestamp = Date.now();

  const payload: CommandPayload = {
    commandId,
    params,
    source,
    executionId,
    timestamp,
  };

  // Notify listeners: before
  emit({ type: 'before-execute', payload });

  // Resolve command
  const resolved = findCommand(commandId);
  if (!resolved) {
    const result: CommandResult = {
      executionId,
      commandId,
      ok: false,
      error: `Command not found: ${commandId}`,
      duration: 0,
    };
    emit({ type: 'error', payload, result });
    return result;
  }

  const start = performance.now();
  try {
    const data = await resolved.handler(params);
    const duration = performance.now() - start;

    const result: CommandResult = {
      executionId,
      commandId,
      ok: true,
      data,
      duration,
    };

    // Record in history (truncate any redo entries)
    history.length = historyIndex + 1;
    history.push({ payload, result });
    historyIndex = history.length - 1;

    // Cap history at 100 entries
    if (history.length > 100) {
      history.shift();
      historyIndex -= 1;
    }

    emit({ type: 'after-execute', payload, result });
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const result: CommandResult = {
      executionId,
      commandId,
      ok: false,
      error: message,
      duration,
    };
    emit({ type: 'error', payload, result });
    return result;
  }
}

// ---------------------------------------------------------------------------
// History & undo / redo
// ---------------------------------------------------------------------------

/** Get the command history. */
export function getHistory(): ReadonlyArray<HistoryEntry> {
  return history;
}

/** Get the current history position. */
export function getHistoryIndex(): number {
  return historyIndex;
}

/**
 * Undo the last command that supports it.
 * Walks backward through history until it finds an entry with an undo function.
 *
 * @returns The undone entry, or null if nothing to undo.
 */
export async function undo(): Promise<HistoryEntry | null> {
  let idx = historyIndex;
  while (idx >= 0) {
    const entry = history[idx];
    if (entry.undo) {
      try {
        await entry.undo();
        historyIndex = idx - 1;
        return entry;
      } catch {
        // Skip entries whose undo fails
      }
    }
    idx -= 1;
  }
  return null;
}

/**
 * Redo the next command that was undone.
 * Walks forward through history.
 *
 * @returns The redone entry, or null if nothing to redo.
 */
export async function redo(): Promise<HistoryEntry | null> {
  let idx = historyIndex + 1;
  while (idx < history.length) {
    const entry = history[idx];
    if (entry.undo) {
      try {
        // Re-execute the command
        const result = await execute(
          entry.payload.commandId,
          entry.payload.params ?? {},
          'internal',
        );
        historyIndex = idx;
        return { ...entry, result };
      } catch {
        // Skip entries whose redo fails
      }
    }
    idx += 1;
  }
  return null;
}

/** Check if undo is available. */
export function canUndo(): boolean {
  for (let i = historyIndex; i >= 0; i--) {
    if (history[i].undo) return true;
  }
  return false;
}

/** Check if redo is available. */
export function canRedo(): boolean {
  for (let i = historyIndex + 1; i < history.length; i++) {
    if (history[i].undo) return true;
  }
  return false;
}

/**
 * Register an undo function for the most recent history entry.
 * Useful for commands that perform side effects after execution.
 */
export function attachUndo(executionId: string, undoFn: () => void | Promise<void>): boolean {
  const entry = history.find((e) => e.payload.executionId === executionId);
  if (!entry) return false;
  entry.undo = undoFn;
  return true;
}

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

/** Clear all history and listeners. For testing only. */
export function resetCommandBus(): void {
  listeners.clear();
  history.length = 0;
  historyIndex = -1;
  executionCounter = 0;
}
