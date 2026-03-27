import { create } from 'zustand';
import type { WindowState } from '../types';
import { useAppStore } from './appStore';

let nextZIndex = 10;
let windowCounter = 0;

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
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateTitle: (windowId: string, title: string) => void;
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
}));
