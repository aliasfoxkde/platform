import { create } from 'zustand';
import type { Command } from '../types';
import { useCommandStore } from './commandStore';

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  recentCommandIds: string[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  markRecent: (commandId: string) => void;
  executeSelected: () => void;
  getFilteredCommands: () => Command[];
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: '',
  selectedIndex: 0,
  recentCommandIds: [],

  open: () => set({ isOpen: true, query: '', selectedIndex: 0 }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      get().close();
    } else {
      get().open();
    }
  },

  setQuery: (query) => {
    set({ query, selectedIndex: 0 });
  },

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  selectNext: () =>
    set((state) => {
      const max = get().getFilteredCommands().length - 1;
      return { selectedIndex: Math.min(state.selectedIndex + 1, max) };
    }),

  selectPrevious: () =>
    set((state) => ({
      selectedIndex: Math.max(state.selectedIndex - 1, 0),
    })),

  markRecent: (commandId) =>
    set((state) => {
      const filtered = state.recentCommandIds.filter((id) => id !== commandId);
      return { recentCommandIds: [commandId, ...filtered].slice(0, 10) };
    }),

  executeSelected: () => {
    const commands = get().getFilteredCommands();
    const idx = get().selectedIndex;
    if (commands[idx]) {
      get().markRecent(commands[idx].id);
      useCommandStore.getState().executeCommand(commands[idx].id);
      get().close();
    }
  },

  getFilteredCommands: () => {
    const commands = useCommandStore.getState().commands;
    const { query, recentCommandIds } = get();
    const q = query.toLowerCase().trim();

    if (!q) {
      const recent = recentCommandIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined);
      const rest = commands.filter(
        (c) => !recentCommandIds.includes(c.id),
      );
      return [...recent, ...rest];
    }

    return commands.filter((cmd) => {
      const label = cmd.label.toLowerCase();
      const terms = q.split(/\s+/);
      let idx = 0;
      for (const term of terms) {
        const pos = label.indexOf(term, idx);
        if (pos === -1) return false;
        idx = pos + term.length;
      }
      return true;
    });
  },
}));
