/**
 * Command Bus types.
 *
 * The command bus is the central nervous system of WebOS. Every interaction
 * — GUI click, keyboard shortcut, terminal input, AI tool call — goes through
 * the bus as a command that gets routed to the appropriate capability handler.
 */

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

/** Where the command originated from. */
export type CommandSource = 'gui' | 'keyboard' | 'terminal' | 'ai' | 'internal';

/** A command being dispatched on the bus. */
export interface CommandPayload {
  /** Full command ID (namespaced as `capabilityId.commandId`). */
  commandId: string;
  /** Parameters for the command handler. */
  params?: Record<string, unknown>;
  /** Where the command originated. */
  source: CommandSource;
  /** Unique ID for this specific execution. */
  executionId: string;
  /** Timestamp when the command was dispatched. */
  timestamp: number;
}

/** Result of executing a command. */
export interface CommandResult {
  executionId: string;
  commandId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

// ---------------------------------------------------------------------------
// History & undo
// ---------------------------------------------------------------------------

/** An entry in the command history for undo/redo. */
export interface HistoryEntry {
  payload: CommandPayload;
  result: CommandResult;
  /** If the command supports undo, this reverses it. */
  undo?: () => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type Unsubscribe = () => void;

export interface CommandBusEvent {
  type: 'before-execute' | 'after-execute' | 'error';
  payload: CommandPayload;
  result?: CommandResult;
}

export type CommandBusListener = (event: CommandBusEvent) => void;
