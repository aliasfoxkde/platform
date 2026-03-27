import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      apps: useAppStore.getState().apps,
      pinnedApps: ['terminal', 'editor', 'filemanager', 'settings', 'calculator'],
    });
  });

  it('has built-in apps registered', () => {
    const apps = useAppStore.getState().apps;
    const ids = apps.map((a) => a.id);
    expect(ids).toContain('terminal');
    expect(ids).toContain('editor');
    expect(ids).toContain('filemanager');
    expect(ids).toContain('settings');
    expect(ids).toContain('calculator');
    expect(ids).toContain('about');
  });

  it('getApp returns app by id', () => {
    const app = useAppStore.getState().getApp('terminal');
    expect(app).toBeDefined();
    expect(app?.title).toBe('Terminal');
  });

  it('getApp returns undefined for unknown app', () => {
    const app = useAppStore.getState().getApp('nonexistent');
    expect(app).toBeUndefined();
  });

  it('registerApp adds new app', () => {
    const initialCount = useAppStore.getState().apps.length;
    useAppStore.getState().registerApp({
      id: 'test-app',
      title: 'Test App',
      icon: '🧪',
      category: 'utilities',
      component: 'test',
      defaultWidth: 400,
      defaultHeight: 300,
      minWidth: 200,
      minHeight: 150,
    });
    expect(useAppStore.getState().apps.length).toBe(initialCount + 1);
    expect(useAppStore.getState().getApp('test-app')?.title).toBe('Test App');
  });

  it('registerApp does not duplicate existing app', () => {
    const initialCount = useAppStore.getState().apps.length;
    useAppStore.getState().registerApp({
      id: 'terminal',
      title: 'Terminal Duplicate',
      icon: '⌨️',
      category: 'development',
      component: 'terminal',
      defaultWidth: 720,
      defaultHeight: 480,
      minWidth: 400,
      minHeight: 280,
    });
    expect(useAppStore.getState().apps.length).toBe(initialCount);
  });

  it('unregisterApp removes app', () => {
    useAppStore.getState().unregisterApp('about');
    expect(useAppStore.getState().getApp('about')).toBeUndefined();
  });

  it('unregisterApp also unpins the app', () => {
    useAppStore.getState().registerApp({
      id: 'temp-app',
      title: 'Temp',
      icon: '🧪',
      category: 'utilities',
      component: 'temp',
      defaultWidth: 400,
      defaultHeight: 300,
      minWidth: 200,
      minHeight: 150,
    });
    useAppStore.getState().togglePinned('temp-app');
    expect(useAppStore.getState().pinnedApps).toContain('temp-app');
    useAppStore.getState().unregisterApp('temp-app');
    expect(useAppStore.getState().pinnedApps).not.toContain('temp-app');
  });

  it('togglePinned adds and removes from pinned', () => {
    expect(useAppStore.getState().pinnedApps).toContain('terminal');
    useAppStore.getState().togglePinned('terminal');
    expect(useAppStore.getState().pinnedApps).not.toContain('terminal');
    useAppStore.getState().togglePinned('terminal');
    expect(useAppStore.getState().pinnedApps).toContain('terminal');
  });
});
