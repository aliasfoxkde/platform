import { create } from 'zustand';
import type { WindowState, SnapZone } from '../types';
import { useAppStore } from './appStore';

let nextZIndex = 10;
let windowCounter = 0;

/** Snap threshold in pixels from screen edge. */
const SNAP_THRESHOLD = 12;

/** Get the snap bounds for a given zone. */
export function getSnapBounds(zone: SnapZone): { x: number; y: number; width: number; height: number } {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  switch (zone) {
    case 'left': return { x: 0, y: 0, width: sw / 2, height: sh };
    case 'right': return { x: sw / 2, y: 0, width: sw / 2, height: sh };
    case 'top-left': return { x: 0, y: 0, width: sw / 2, height: sh / 2 };
    case 'top-right': return { x: sw / 2, y: 0, width: sw / 2, height: sh / 2 };
    case 'bottom-left': return { x: 0, y: sh / 2, width: sw / 2, height: sh / 2 };
    case 'bottom-right': return { x: sw / 2, y: sh / 2, width: sw / 2, height: sh / 2 };
    case 'maximized': return { x: 0, y: 0, width: sw, height: sh };
    default: return { x: 0, y: 0, width: sw, height: sh };
  }
}

/** Detect snap zone based on window position during drag. */
export function detectSnapZone(x: number, y: number, width: number, height: number): SnapZone {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const t = SNAP_THRESHOLD;

  // Check corners first (more specific)
  if (x <= t && y <= t) return 'top-left';
  if (x + width >= sw - t && y <= t) return 'top-right';
  if (x <= t && y + height >= sh - t) return 'bottom-left';
  if (x + width >= sw - t && y + height >= sh - t) return 'bottom-right';

  // Check edges
  if (x <= t) return 'left';
  if (x + width >= sw - t) return 'right';
  if (y <= t) return 'maximized';

  return 'none';
}

interface WindowStateStore {
  windows: WindowState[];
  activeWindowId: string | null;
  openWindow: (appId: string) => string | null;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  toggleMinimize: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  toggleMaximize: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  moveWindow: (windowId: string, x: number, y: number) => void;
  moveWindowFull: (windowId: string, x: number, y: number, width: number, height: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateTitle: (windowId: string, title: string) => void;
  snapWindow: (windowId: string, zone: SnapZone) => void;
  unsnapWindow: (windowId: string) => void;
}

export const useWindowStore = create<WindowStateStore>((set, get) => ({
  windows: [],
  activeWindowId: null,

  openWindow: (appId: string) => {
    const app = useAppStore.getState().getApp(appId);
    if (!app) return null;

    // If singleton and already open, just focus it
    if (app.singleton) {
      const existing = get().windows.find((w) => w.appId === appId);
      if (existing) {
        get().focusWindow(existing.id);
        if (existing.isMinimized) get().restoreWindow(existing.id);
        return existing.id;
      }
    }

    windowCounter++;
    const id = `window-${windowCounter}`;
    const offset = (windowCounter % 8) * 30;

    const newWindow: WindowState = {
      id,
      appId: app.id,
      title: app.title,
      icon: app.icon,
      x: 120 + offset,
      y: 60 + offset,
      width: app.defaultWidth,
      height: app.defaultHeight,
      minWidth: app.minWidth,
      minHeight: app.minHeight,
      zIndex: ++nextZIndex,
      isMinimized: false,
      isMaximized: false,
    };

    set((state) => ({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
    }));

    return id;
  },

  closeWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== windowId),
      activeWindowId:
        state.activeWindowId === windowId
          ? state.windows.filter((w) => w.id !== windowId).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null
          : state.activeWindowId,
    })),

  focusWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, zIndex: ++nextZIndex } : w,
      ),
      activeWindowId: windowId,
    })),

  minimizeWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, isMinimized: true } : w,
      ),
      activeWindowId:
        state.activeWindowId === windowId
          ? state.windows.filter((w) => w.id !== windowId).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null
          : state.activeWindowId,
    })),

  toggleMinimize: (windowId: string) => {
    const win = get().windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.isMinimized) {
      get().restoreWindow(windowId);
    } else {
      get().minimizeWindow(windowId);
    }
  },

  maximizeWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        return {
          ...w,
          isMaximized: true,
          preMaximizeBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }),
    })),

  toggleMaximize: (windowId: string) => {
    const win = get().windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.isMaximized) {
      get().restoreWindow(windowId);
    } else {
      get().maximizeWindow(windowId);
    }
  },

  restoreWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        const restored = {
          ...w,
          isMinimized: false,
          zIndex: ++nextZIndex,
        };
        if (w.isMaximized && w.preMaximizeBounds) {
          restored.isMaximized = false;
          restored.x = w.preMaximizeBounds.x;
          restored.y = w.preMaximizeBounds.y;
          restored.width = w.preMaximizeBounds.width;
          restored.height = w.preMaximizeBounds.height;
          restored.preMaximizeBounds = undefined;
        }
        return restored;
      }),
      activeWindowId: windowId,
    })),

  moveWindow: (windowId: string, x: number, y: number) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, x, y } : w,
      ),
    })),

  moveWindowFull: (windowId: string, x: number, y: number, width: number, height: number) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        return {
          ...w,
          x,
          y,
          width: Math.max(w.minWidth, width),
          height: Math.max(w.minHeight, height),
        };
      }),
    })),

  resizeWindow: (windowId: string, width: number, height: number) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        return {
          ...w,
          width: Math.max(w.minWidth, width),
          height: Math.max(w.minHeight, height),
        };
      }),
    })),

  updateTitle: (windowId: string, title: string) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, title } : w,
      ),
    })),

  snapWindow: (windowId: string, zone: SnapZone) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        const bounds = getSnapBounds(zone);
        return {
          ...w,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          preMaximizeBounds: w.preMaximizeBounds ?? { x: w.x, y: w.y, width: w.width, height: w.height },
          snapZone: zone,
          isMaximized: zone === 'maximized',
        };
      }),
    })),

  unsnapWindow: (windowId: string) =>
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId || !w.preMaximizeBounds) return w;
        return {
          ...w,
          x: w.preMaximizeBounds.x,
          y: w.preMaximizeBounds.y,
          width: w.preMaximizeBounds.width,
          height: w.preMaximizeBounds.height,
          snapZone: undefined,
          isMaximized: false,
          preMaximizeBounds: undefined,
        };
      }),
    })),
}));
