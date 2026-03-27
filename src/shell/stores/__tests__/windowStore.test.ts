import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowStore } from '../windowStore';
import { useAppStore } from '../appStore';

describe('windowStore', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], activeWindowId: null });
  });

  it('opens a window for a registered app', () => {
    const windowId = useWindowStore.getState().openWindow('terminal');
    expect(windowId).toBeTruthy();
    expect(useWindowStore.getState().windows).toHaveLength(1);
    expect(useWindowStore.getState().activeWindowId).toBe(windowId);
  });

  it('returns null for unregistered app', () => {
    const windowId = useWindowStore.getState().openWindow('nonexistent');
    expect(windowId).toBeNull();
    expect(useWindowStore.getState().windows).toHaveLength(0);
  });

  it('window has correct app metadata', () => {
    const windowId = useWindowStore.getState().openWindow('calculator')!;
    const win = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(win.appId).toBe('calculator');
    expect(win.title).toBe('Calculator');
    expect(win.icon).toBe('🧮');
    expect(win.isMinimized).toBe(false);
    expect(win.isMaximized).toBe(false);
  });

  it('closes a window', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    expect(useWindowStore.getState().windows).toHaveLength(1);
    useWindowStore.getState().closeWindow(windowId);
    expect(useWindowStore.getState().windows).toHaveLength(0);
    expect(useWindowStore.getState().activeWindowId).toBeNull();
  });

  it('focusWindow updates z-index', () => {
    const id1 = useWindowStore.getState().openWindow('terminal')!;
    const id2 = useWindowStore.getState().openWindow('calculator')!;
    const win1 = useWindowStore.getState().windows.find((w) => w.id === id1)!;
    const win2 = useWindowStore.getState().windows.find((w) => w.id === id2)!;
    expect(win2.zIndex).toBeGreaterThan(win1.zIndex);
    useWindowStore.getState().focusWindow(id1);
    const updated = useWindowStore.getState().windows.find((w) => w.id === id1)!;
    expect(updated.zIndex).toBeGreaterThan(win2.zIndex);
  });

  it('minimizes and restores window', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    useWindowStore.getState().minimizeWindow(windowId);
    const win = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(win.isMinimized).toBe(true);
    useWindowStore.getState().restoreWindow(windowId);
    const restored = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(restored.isMinimized).toBe(false);
  });

  it('maximizes window to fill viewport', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    useWindowStore.getState().maximizeWindow(windowId);
    const win = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(win.isMaximized).toBe(true);
    expect(win.width).toBe(window.innerWidth);
    expect(win.height).toBe(window.innerHeight);
  });

  it('restoreWindow restores pre-maximize bounds', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    const original = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    const origW = original.width;
    const origH = original.height;
    useWindowStore.getState().maximizeWindow(windowId);
    useWindowStore.getState().restoreWindow(windowId);
    const restored = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(restored.isMaximized).toBe(false);
    expect(restored.width).toBe(origW);
    expect(restored.height).toBe(origH);
  });

  it('singleton apps reuse existing window', () => {
    const app = useAppStore.getState().getApp('about')!;
    expect(app.singleton).toBe(true);
    const id1 = useWindowStore.getState().openWindow('about')!;
    const id2 = useWindowStore.getState().openWindow('about')!;
    expect(id1).toBe(id2);
    expect(useWindowStore.getState().windows).toHaveLength(1);
  });

  it('moveWindow updates position', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    useWindowStore.getState().moveWindow(windowId, 100, 200);
    const win = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(win.x).toBe(100);
    expect(win.y).toBe(200);
  });

  it('resizeWindow enforces minimum dimensions', () => {
    const windowId = useWindowStore.getState().openWindow('terminal')!;
    useWindowStore.getState().resizeWindow(windowId, 50, 50);
    const win = useWindowStore.getState().windows.find((w) => w.id === windowId)!;
    expect(win.width).toBeGreaterThanOrEqual(win.minWidth);
    expect(win.height).toBeGreaterThanOrEqual(win.minHeight);
  });
});
