import { create } from 'zustand';
import type { Wallpaper } from '../types';

const DEFAULT_WALLPAPERS: Wallpaper[] = [
  {
    id: 'cosmic-dark',
    label: 'Cosmic Dark',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0c0e1a 0%, #1a1a3e 40%, #0d1b2a 70%, #0c0e1a 100%)',
  },
  {
    id: 'ocean-dusk',
    label: 'Ocean Dusk',
    type: 'gradient',
    value: 'linear-gradient(160deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0a0a23 0%, #1b1b3a 30%, #0d3b2e 60%, #1a0a2e 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    type: 'solid',
    value: '#0a0a0f',
  },
];

interface ThemeState {
  theme: 'dark' | 'light';
  wallpaper: Wallpaper;
  wallpapers: Wallpaper[];
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setWallpaper: (wallpaper: Wallpaper) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  wallpaper: DEFAULT_WALLPAPERS[0],
  wallpapers: DEFAULT_WALLPAPERS,
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
}));
