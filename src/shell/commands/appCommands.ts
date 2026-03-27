/**
 * App-specific commands registered in the command palette.
 *
 * These complement the auto-generated "Open <App>" commands by providing
 * deeper, action-oriented shortcuts for power users.
 */

import { useCommandStore } from '../stores/commandStore';
import { useWindowStore } from '../stores/windowStore';

const APP_COMMANDS = [
  {
    id: 'terminal.open',
    label: 'Open Terminal',
    shortcut: 'Ctrl+`',
    category: 'application',
    action: () => useWindowStore.getState().openWindow('terminal'),
  },
  {
    id: 'notes.new',
    label: 'New Note',
    category: 'application',
    action: () => useWindowStore.getState().openWindow('notes'),
  },
  {
    id: 'calculator.open',
    label: 'Open Calculator',
    category: 'application',
    action: () => useWindowStore.getState().openWindow('calculator'),
  },
  {
    id: 'filemanager.open',
    label: 'Open File Manager',
    category: 'application',
    action: () => useWindowStore.getState().openWindow('filemanager'),
  },
];

/** Register all app-specific commands. Call once at startup. */
export function registerAppCommands(): void {
  const store = useCommandStore.getState();
  for (const cmd of APP_COMMANDS) {
    store.registerCommand(cmd);
  }
}
