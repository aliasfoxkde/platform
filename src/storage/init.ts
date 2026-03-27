/**
 * Storage initialization.
 *
 * Call `initStorage()` once from App.tsx on mount. This:
 * 1. Initializes the VFS with default directories and files
 * 2. Wires Zustand stores to IndexedDB persistence
 */

import { initVFS } from './vfs';
import { persistStore } from './persist';
import { useThemeStore } from '@/shell/stores/themeStore';
import { useAppStore } from '@/shell/stores/appStore';
import { useCommandPaletteStore } from '@/shell/stores/commandPaletteStore';

// Register built-in capabilities (side-effect import)
import '@/capabilities/registered';
import { registerAppCommands } from '@/shell/commands/appCommands';

let initialized = false;

export async function initStorage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Initialize the virtual filesystem
  await initVFS();

  // Persist theme preferences (theme mode + wallpaper selection)
  persistStore(useThemeStore, 'theme', ['theme', 'wallpaper']);

  // Persist pinned apps
  persistStore(useAppStore, 'app', ['pinnedApps']);

  // Persist recent commands
  persistStore(useCommandPaletteStore, 'command-palette', ['recentCommandIds']);

  // Register app-specific command palette entries
  registerAppCommands();
}
