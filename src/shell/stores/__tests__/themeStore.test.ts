import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      theme: 'dark',
      wallpaper: useThemeStore.getState().wallpapers[0],
    });
    document.documentElement.removeAttribute('data-theme');
  });

  it('initializes with dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme updates theme and sets data-theme attribute', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggleTheme switches between dark and light', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setWallpaper updates wallpaper', () => {
    const wallpapers = useThemeStore.getState().wallpapers;
    useThemeStore.getState().setWallpaper(wallpapers[1]);
    expect(useThemeStore.getState().wallpaper.id).toBe(wallpapers[1].id);
  });

  it('has at least 4 built-in wallpapers', () => {
    expect(useThemeStore.getState().wallpapers.length).toBeGreaterThanOrEqual(4);
  });
});
