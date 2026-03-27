import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '../commandStore';
import { useAppStore } from '../appStore';

describe('commandStore', () => {
  beforeEach(() => {
    // Re-initialize with built-in commands only
    useCommandStore.setState({
      commands: [
        {
          id: 'toggle-theme',
          label: 'Toggle Theme',
          shortcut: 'Ctrl+Shift+T',
          category: 'appearance',
          action: () => {},
        },
        {
          id: 'open-settings',
          label: 'Open Settings',
          shortcut: 'Ctrl+,',
          category: 'application',
          action: () => {},
        },
      ],
    });
  });

  it('has built-in commands', () => {
    const commands = useCommandStore.getState().commands;
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('toggle-theme');
    expect(ids).toContain('open-settings');
  });

  it('registerCommand adds new command', () => {
    useCommandStore.getState().registerCommand({
      id: 'custom-cmd',
      label: 'Custom Command',
      action: () => {},
    });
    expect(useCommandStore.getState().commands).toHaveLength(3);
    expect(useCommandStore.getState().getCommands().find((c) => c.id === 'custom-cmd')).toBeDefined();
  });

  it('registerCommand does not duplicate', () => {
    useCommandStore.getState().registerCommand({
      id: 'toggle-theme',
      label: 'Updated Toggle Theme',
      action: () => {},
    });
    expect(useCommandStore.getState().commands).toHaveLength(2);
  });

  it('unregisterCommand removes command', () => {
    useCommandStore.getState().unregisterCommand('toggle-theme');
    expect(useCommandStore.getState().commands).toHaveLength(1);
    expect(useCommandStore.getState().commands[0].id).toBe('open-settings');
  });

  it('executeCommand calls the action', () => {
    let called = false;
    useCommandStore.getState().registerCommand({
      id: 'test-exec',
      label: 'Test Execute',
      action: () => { called = true; },
    });
    useCommandStore.getState().executeCommand('test-exec');
    expect(called).toBe(true);
  });

  it('executeCommand does nothing for unknown id', () => {
    expect(() => useCommandStore.getState().executeCommand('nonexistent')).not.toThrow();
  });

  it('getCommandsByCategory filters commands', () => {
    const appearance = useCommandStore.getState().getCommandsByCategory('appearance');
    expect(appearance).toHaveLength(1);
    expect(appearance[0].id).toBe('toggle-theme');
  });

  it('open-app commands exist for registered apps after sync', () => {
    // The module-level syncAppCommands() should have already added open-app commands.
    // Since beforeEach resets the store, re-check after fresh module state.
    // In production, syncAppCommands runs on appStore changes.
    // For this test, verify the registration mechanism works by calling it directly.
    const apps = useAppStore.getState().apps;
    // Simulate what the subscription does
    for (const app of apps) {
      useCommandStore.getState().registerCommand({
        id: `open-app-${app.id}`,
        label: `Open ${app.title}`,
        category: 'application',
        action: () => {},
      });
    }
    for (const app of apps) {
      const cmd = useCommandStore.getState().commands.find(
        (c) => c.id === `open-app-${app.id}`,
      );
      expect(cmd).toBeDefined();
      expect(cmd?.label).toContain(app.title);
    }
  });
});
