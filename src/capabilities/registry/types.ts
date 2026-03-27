/**
 * Capability Registry types.
 *
 * A "capability" is a self-describing unit of functionality with a stable ID,
 * version, permissions, and a set of callable commands.
 */

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------

/** Built-in permission categories the shell understands. */
export type PermissionScope =
  | 'storage'     // read/write VFS
  | 'clipboard'   // system clipboard
  | 'network'     // fetch / websocket
  | 'notification'// toast / notification center
  | 'window'      // open / close / focus windows
  | 'process'     // spawn / terminate processes
  | 'shell'       // execute shell commands
  | 'settings'    // read/write user settings
  | 'audio'       // play / record audio
  | 'video'       // play / record video
  | 'geolocation'// browser geolocation
  | string;       // extensible custom scopes

/** A permission a capability may request. */
export interface Permission {
  /** Unique scope identifier (e.g. 'storage:read', 'network:fetch'). */
  scope: PermissionScope;
  /** Human-readable description shown to the user. */
  description: string;
  /** Whether the permission is granted. Determined at runtime. */
  granted?: boolean;
}

// ---------------------------------------------------------------------------
// Command types (callable functions exposed by a capability)
// ---------------------------------------------------------------------------

/** JSON Schema subset for describing parameter shapes. */
export type CommandParamSchema = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
};

/** Schema describing a capability command. */
export interface CommandSchema {
  /** Stable command ID, namespaced (e.g. 'terminal.run', 'files.read'). */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Description of what the command does. */
  description?: string;
  /** JSON-Schema-style parameter definitions. */
  params?: Record<string, CommandParamSchema>;
  /** Permission scope required to invoke this command. */
  permission?: PermissionScope;
}

/** The runtime callable for a command. */
export type CommandHandler = (params: Record<string, unknown>) => unknown | Promise<unknown>;

/** A registered command with its handler attached. */
export interface RegisteredCommand extends CommandSchema {
  handler: CommandHandler;
}

// ---------------------------------------------------------------------------
// Capability manifest
// ---------------------------------------------------------------------------

/** Semantic version string (major.minor.patch). */
export type SemVer = `${number}.${number}.${number}`;

/** The manifest describing a capability. */
export interface CapabilityManifest {
  /** Unique capability ID (e.g. 'terminal', 'file-manager', 'ai-chat'). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Semantic version. */
  version: SemVer;
  /** Brief description. */
  description?: string;
  /** App category for UI grouping. */
  category?: string;
  /** Permissions this capability requires. */
  permissions: Permission[];
  /** Command schemas this capability exposes. */
  commands: CommandSchema[];
}

/** A fully registered capability with manifest + runtime handlers. */
export interface RegisteredCapability extends CapabilityManifest {
  /** Commands with their handlers attached. */
  handlers: Map<string, CommandHandler>;
  /** Whether the capability is currently active/enabled. */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Permission request / grant events
// ---------------------------------------------------------------------------

export type PermissionDecision = 'granted' | 'denied' | 'dismissed';

export interface PermissionRequest {
  capabilityId: string;
  permission: Permission;
  resolve: (decision: PermissionDecision) => void;
}
