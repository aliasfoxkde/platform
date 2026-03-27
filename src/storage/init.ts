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

/** Persist window layout (debounced). */
function persistWindows(): void {
  const save = () => {
    const { windows } = useWindowStore.getState();
    const layout = windows.map((w) => ({
      appId: w.appId,
      title: w.title,
      icon: w.icon,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      minWidth: w.minWidth,
      minHeight: w.minHeight,
      isMaximized: w.isMaximized,
      snapZone: w.snapZone,
      preMaximizeBounds: w.preMaximizeBounds,
    }));
    try {
      localStorage.setItem('webos-window-layout', JSON.stringify(layout));
    } catch {
      // Storage unavailable
    }
  };

  // Save on changes (debounced)
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 300);
  };

  // Subscribe to window store changes
  const { subscribe } = useWindowStore;
  subscribe(debouncedSave);

  // Restore on first load
  try {
    const raw = localStorage.getItem('webos-window-layout');
    if (raw) {
      const layout = JSON.parse(raw);
      if (Array.isArray(layout) && layout.length > 0) {
        // Clear saved layout so it's not restored again on next init
        localStorage.removeItem('webos-window-layout');
      }
    }
  } catch {
    // Ignore
  }
}

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

  // Persist window layout on changes
  persistWindows();
}
