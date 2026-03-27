import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '../../stores/commandStore';
import { registerAppCommands } from '../appCommands';

describe('App commands', () => {
  beforeEach(() => {
    // Reset the command store's registered commands to built-ins only
    const store = useCommandStore.getState();
    for (const cmd of store.commands) {
      if (cmd.id.startsWith('terminal.') || cmd.id.startsWith('notes.') ||
          cmd.id.startsWith('calculator.') || cmd.id.startsWith('filemanager.')) {
        useCommandStore.getState().unregisterCommand(cmd.id);
      }
    }
  });

  it('registers terminal.open command', () => {
    registerAppCommands();
    const cmd = useCommandStore.getState().commands.find((c) => c.id === 'terminal.open');
    expect(cmd).toBeDefined();
    expect(cmd!.label).toBe('Open Terminal');
    expect(cmd!.shortcut).toBe('Ctrl+`');
  });

  it('registers notes.new command', () => {
    registerAppCommands();
    const cmd = useCommandStore.getState().commands.find((c) => c.id === 'notes.new');
    expect(cmd).toBeDefined();
    expect(cmd!.label).toBe('New Note');
  });

  it('registers calculator.open command', () => {
    registerAppCommands();
    const cmd = useCommandStore.getState().commands.find((c) => c.id === 'calculator.open');
    expect(cmd).toBeDefined();
    expect(cmd!.label).toBe('Open Calculator');
  });

  it('registers filemanager.open command', () => {
    registerAppCommands();
    const cmd = useCommandStore.getState().commands.find((c) => c.id === 'filemanager.open');
    expect(cmd).toBeDefined();
    expect(cmd!.label).toBe('Open File Manager');
  });

  it('does not duplicate commands on repeated registration', () => {
    registerAppCommands();
    registerAppCommands();
    const count = useCommandStore.getState().commands.filter(
      (c) => c.id === 'terminal.open'
    ).length;
    expect(count).toBe(1);
  });
});
