import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowStore, getSnapBounds, detectSnapZone } from '../windowStore';
import type { SnapZone } from '../../types';

// Mock window dimensions
Object.defineProperty(globalThis, 'window', {
  value: { innerWidth: 1200, innerHeight: 800 },
  writable: true,
});

describe('Snap zone detection', () => {
  it('detects left snap zone', () => {
    expect(detectSnapZone(0, 100, 400, 600)).toBe('left');
    expect(detectSnapZone(10, 100, 400, 600)).toBe('left');
  });

  it('detects right snap zone', () => {
    expect(detectSnapZone(800, 100, 400, 600)).toBe('right');
    expect(detectSnapZone(1188, 100, 400, 600)).toBe('right');
  });

  it('detects top maximize', () => {
    expect(detectSnapZone(100, 0, 400, 600)).toBe('maximized');
    expect(detectSnapZone(100, 10, 400, 600)).toBe('maximized');
  });

  it('detects top-left corner', () => {
    expect(detectSnapZone(0, 0, 400, 600)).toBe('top-left');
  });

  it('detects top-right corner', () => {
    expect(detectSnapZone(800, 0, 400, 600)).toBe('top-right');
  });

  it('detects bottom-left corner', () => {
    expect(detectSnapZone(0, 200, 400, 600)).toBe('bottom-left');
  });

  it('detects bottom-right corner', () => {
    expect(detectSnapZone(800, 200, 400, 600)).toBe('bottom-right');
  });

  it('returns none for center position', () => {
    expect(detectSnapZone(400, 300, 400, 200)).toBe('none');
  });
});

describe('Snap bounds calculation', () => {
  it('left half', () => {
    const bounds = getSnapBounds('left');
    expect(bounds).toEqual({ x: 0, y: 0, width: 600, height: 800 });
  });

  it('right half', () => {
    const bounds = getSnapBounds('right');
    expect(bounds).toEqual({ x: 600, y: 0, width: 600, height: 800 });
  });

  it('maximized', () => {
    const bounds = getSnapBounds('maximized');
    expect(bounds).toEqual({ x: 0, y: 0, width: 1200, height: 800 });
  });

  it('top-left quarter', () => {
    const bounds = getSnapBounds('top-left');
    expect(bounds).toEqual({ x: 0, y: 0, width: 600, height: 400 });
  });

  it('bottom-right quarter', () => {
    const bounds = getSnapBounds('bottom-right');
    expect(bounds).toEqual({ x: 600, y: 400, width: 600, height: 400 });
  });
});

describe('Window snap/unsnap in store', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], activeWindowId: null });
  });

  it('snaps window to left half', () => {
    useWindowStore.getState().openWindow('terminal');
    const winId = useWindowStore.getState().windows[0].id;
    useWindowStore.getState().snapWindow(winId, 'left');
    const win = useWindowStore.getState().windows.find((w) => w.id === winId);
    expect(win).toBeDefined();
    expect(win!.x).toBe(0);
    expect(win!.y).toBe(0);
    expect(win!.width).toBe(600);
    expect(win!.height).toBe(800);
    expect(win!.snapZone).toBe('left');
    expect(win!.preMaximizeBounds).toBeDefined();
  });

  it('unsnap window restores original bounds', () => {
    useWindowStore.getState().openWindow('terminal');
    const winId = useWindowStore.getState().windows[0].id;
    useWindowStore.getState().snapWindow(winId, 'left');
    useWindowStore.getState().unsnapWindow(winId);
    const win = useWindowStore.getState().windows.find((w) => w.id === winId);
    expect(win!.snapZone).toBeUndefined();
    expect(win!.preMaximizeBounds).toBeUndefined();
  });

  it('snaps window to maximized', () => {
    useWindowStore.getState().openWindow('terminal');
    const winId = useWindowStore.getState().windows[0].id;
    useWindowStore.getState().snapWindow(winId, 'maximized');
    const win = useWindowStore.getState().windows.find((w) => w.id === winId);
    expect(win!.isMaximized).toBe(true);
    expect(win!.snapZone).toBe('maximized');
  });

  it('moveWindowFull updates position and size', () => {
    useWindowStore.getState().openWindow('terminal');
    const winId = useWindowStore.getState().windows[0].id;
    useWindowStore.getState().moveWindowFull(winId, 50, 50, 500, 400);
    const win = useWindowStore.getState().windows.find((w) => w.id === winId);
    expect(win!.x).toBe(50);
    expect(win!.y).toBe(50);
    expect(win!.width).toBe(500);
    expect(win!.height).toBe(400);
  });
});
