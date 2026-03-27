export {
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
} from './registry';

export type {
  PermissionScope,
  Permission,
  CommandParamSchema,
  CommandSchema,
  CommandHandler,
  RegisteredCommand,
  SemVer,
  CapabilityManifest,
  RegisteredCapability,
  PermissionDecision,
  PermissionRequest,
} from './types';
