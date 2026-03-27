/**
 * Capability Registry — central registration, discovery, and permission system.
 *
 * This is a plain TypeScript module (no Zustand) because the registry is
 * singleton infrastructure, not UI state.
 */

import type {
  CapabilityManifest,
  CommandHandler,
  CommandSchema,
  Permission,
  PermissionDecision,
  PermissionRequest,
  PermissionScope,
  RegisteredCapability,
} from './types';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const capabilities = new Map<string, RegisteredCapability>();
const permissionRequests: PermissionRequest[] = [];
let permissionHandler: ((request: PermissionRequest) => void) | null = null;

// ---------------------------------------------------------------------------
// Register / unregister
// ---------------------------------------------------------------------------

/**
 * Register a capability with its command handlers.
 *
 * @param manifest  - The capability manifest describing commands & permissions.
 * @param handlers  - A map of `commandId → handler function`.
 * @throws          If a capability with the same ID is already registered.
 */
export function registerCapability(
  manifest: CapabilityManifest,
  handlers: Record<string, CommandHandler>,
): void {
  if (capabilities.has(manifest.id)) {
    throw new Error(`Capability "${manifest.id}" is already registered`);
  }

  const handlerMap = new Map<string, CommandHandler>();
  for (const [cmdId, handler] of Object.entries(handlers)) {
    const schema = manifest.commands.find((c) => c.id === cmdId);
    if (!schema) {
      throw new Error(
        `Handler for unknown command "${cmdId}" in capability "${manifest.id}"`,
      );
    }
    handlerMap.set(cmdId, handler);
  }

  capabilities.set(manifest.id, {
    ...manifest,
    handlers: handlerMap,
    enabled: true,
  });
}

/**
 * Unregister a capability. All its commands become unavailable.
 *
 * @returns `true` if the capability was found and removed.
 */
export function unregisterCapability(id: string): boolean {
  return capabilities.delete(id);
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/** Get a registered capability by ID. */
export function getCapability(id: string): RegisteredCapability | undefined {
  return capabilities.get(id);
}

/** List all registered capabilities. */
export function listCapabilities(): RegisteredCapability[] {
  return Array.from(capabilities.values());
}

/**
 * Find a specific command handler across all capabilities.
 *
 * Commands are namespaced as `capabilityId.commandId`.
 * You can also look up by just `commandId` — the first match wins.
 */
export function findCommand(commandId: string): {
  capabilityId: string;
  handler: CommandHandler;
  schema: CommandSchema;
} | null {
  // Try namespaced lookup first: "terminal.run"
  const dotIndex = commandId.indexOf('.');
  if (dotIndex > 0) {
    const capId = commandId.slice(0, dotIndex);
    const cmdName = commandId.slice(dotIndex + 1);
    const cap = capabilities.get(capId);
    if (cap) {
      const schema = cap.commands.find((c) => c.id === cmdName);
      const handler = cap.handlers.get(cmdName);
      if (schema && handler) {
        return { capabilityId: capId, handler, schema };
      }
    }
  }

  // Fall back to flat lookup across all capabilities
  for (const [capId, cap] of capabilities) {
    const schema = cap.commands.find((c) => c.id === commandId);
    const handler = cap.handlers.get(commandId);
    if (schema && handler) {
      return { capabilityId: capId, handler, schema };
    }
  }

  return null;
}

/** List all commands across all capabilities. */
export function listCommands(): Array<{
  capabilityId: string;
  schema: CommandSchema;
}> {
  const result: Array<{ capabilityId: string; schema: CommandSchema }> = [];
  for (const [capId, cap] of capabilities) {
    for (const schema of cap.commands) {
      result.push({ capabilityId: capId, schema });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Enable / disable
// ---------------------------------------------------------------------------

/** Enable or disable a capability. Disabled capabilities cannot execute commands. */
export function setCapabilityEnabled(id: string, enabled: boolean): boolean {
  const cap = capabilities.get(id);
  if (!cap) return false;
  cap.enabled = enabled;
  return true;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Set a global permission request handler.
 * Called when a capability needs a permission that hasn't been granted yet.
 * The handler should present a UI prompt and call `request.resolve(decision)`.
 */
export function setPermissionHandler(
  handler: ((request: PermissionRequest) => void) | null,
): void {
  permissionHandler = handler;
}

/** Check if a specific permission scope is granted for a capability. */
export function hasPermission(
  capabilityId: string,
  scope: PermissionScope,
): boolean {
  const cap = capabilities.get(capabilityId);
  if (!cap) return false;
  const perm = cap.permissions.find((p) => p.scope === scope);
  return perm?.granted === true;
}

/**
 * Grant or revoke a permission for a capability.
 */
export function setPermission(
  capabilityId: string,
  scope: PermissionScope,
  granted: boolean,
): void {
  const cap = capabilities.get(capabilityId);
  if (!cap) return;
  const perm = cap.permissions.find((p) => p.scope === scope);
  if (perm) {
    perm.granted = granted;
  }
}

/**
 * Request a permission for a capability.
 *
 * If already granted, resolves immediately.
 * Otherwise, queues a permission request for the UI handler.
 * Falls back to granting automatically if no handler is set.
 */
export async function requestPermission(
  capabilityId: string,
  scope: PermissionScope,
): Promise<PermissionDecision> {
  if (hasPermission(capabilityId, scope)) {
    return 'granted';
  }

  const cap = capabilities.get(capabilityId);
  if (!cap) return 'denied';

  const perm = cap.permissions.find((p) => p.scope === scope);
  if (!perm) return 'denied';

  // No handler installed → auto-grant
  if (!permissionHandler) {
    perm.granted = true;
    return 'granted';
  }

  // Prompt the user
  return new Promise<PermissionDecision>((resolve) => {
    const request: PermissionRequest = {
      capabilityId,
      permission: perm,
      resolve,
    };
    permissionRequests.push(request);
    permissionHandler!(request);
  });
}

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

/** Clear all registrations and state. For testing only. */
export function resetRegistry(): void {
  capabilities.clear();
  permissionRequests.length = 0;
  permissionHandler = null;
}
