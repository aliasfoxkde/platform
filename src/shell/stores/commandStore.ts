import { create } from 'zustand';
import type { Command } from '../types';
import { useAppStore } from './appStore';
import { useWindowStore } from './windowStore';
import { useThemeStore } from './themeStore';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface CommandStoreState {
  commands: Command[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface CommandStoreActions {
  registerCommand: (command: Command) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => void;
  getCommands: () => Command[];
  getCommandsByCategory: (category: string) => Command[];
}

export type CommandStore = CommandStoreState & CommandStoreActions;

// ---------------------------------------------------------------------------
// Built-in commands
// ---------------------------------------------------------------------------

function createBuiltinCommands(): Command[] {
  return [
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      shortcut: 'Ctrl+Shift+T',
      category: 'appearance',
      action: () => {
        useThemeStore.getState().toggleTheme();
      },
    },
    {
      id: 'command-palette',
      label: 'Command Palette',
      shortcut: 'Ctrl+K',
      category: 'general',
      action: () => {
        // no-op: handled by the palette component itself
      },
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      shortcut: 'Ctrl+,',
      category: 'application',
      action: () => {
        useWindowStore.getState().openWindow('settings');
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommandStore = create<CommandStore>()((set, get) => ({
  commands: createBuiltinCommands(),

  registerCommand(command) {
    set((state) => {
      if (state.commands.some((c) => c.id === command.id)) return state;
      return { commands: [...state.commands, command] };
    });
  },

  unregisterCommand(id) {
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    }));
  },

  executeCommand(id) {
    const command = get().commands.find((c) => c.id === id);
    if (command) {
      command.action();
    }
  },

  getCommands() {
    return get().commands;
  },

  getCommandsByCategory(category) {
    return get().commands.filter((c) => c.category === category);
  },
}));

// ---------------------------------------------------------------------------
// Dynamically register open-app commands for all registered apps
// ---------------------------------------------------------------------------

function syncAppCommands(): void {
  const store = useCommandStore.getState();
  const apps = useAppStore.getState().apps;

  for (const app of apps) {
    const commandId = `open-app-${app.id}`;
    const existing = store.commands.find((c) => c.id === commandId);
    if (existing) continue;

    useCommandStore.getState().registerCommand({
      id: commandId,
      label: `Open ${app.title}`,
      category: 'application',
      action: () => {
        useWindowStore.getState().openWindow(app.id);
      },
    });
  }
}

// Subscribe to app store changes so new apps get commands automatically.
useAppStore.subscribe(syncAppCommands);
// Run once on initialization.
syncAppCommands();
