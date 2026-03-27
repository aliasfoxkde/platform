import { useRef, useEffect, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  parseCommandLine,
  tabComplete,
} from './shell';
import type { ShellContext } from './shell';

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const TERMINAL_THEME = {
  background: '#0d0d0d',
  foreground: '#e0e0e0',
  cursor: '#22c55e',
  cursorAccent: '#0d0d0d',
  selectionBackground: '#334155',
  black: '#0d0d0d',
  red: '#f87171',
  green: '#22c55e',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e0e0e0',
  brightBlack: '#6b7280',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#f3f4f6',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TerminalApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [cwd, setCwd] = useState('/Home');
  const cwdRef = useRef('/Home');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const inputBufferRef = useRef('');
  const isRunningRef = useRef(false);

  // Keep cwdRef in sync
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: TERMINAL_THEME,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // Small delay for layout, then fit
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;32mWebOS Terminal v1.0.0\x1b[0m');
    term.writeln("Type 'help' for available commands.\r");

    // Write initial prompt
    writePrompt(term, cwdRef.current);

    return () => {
      fitAddon.dispose();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle input
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const disposable = term.onData(async (data) => {
      if (isRunningRef.current) return;

      if (data === '\r') {
        // Enter — execute command
        await handleEnter(term);
      } else if (data === '\x7f') {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\t') {
        // Tab completion
        await handleTab(term);
      } else if (data === '\x03') {
        // Ctrl+C — cancel current input
        term.writeln('^C');
        writePrompt(term, cwdRef.current);
        inputBufferRef.current = '';
        historyIndexRef.current = -1;
      } else if (data === '\x0c') {
        // Ctrl+L — clear screen
        term.clear();
        writePrompt(term, cwdRef.current);
      } else if (data === '\x1b[A') {
        // Arrow up — history
        navigateHistory(term, -1);
      } else if (data === '\x1b[B') {
        // Arrow down — history
        navigateHistory(term, 1);
      } else if (data >= ' ' && !data.startsWith('\x1b')) {
        // Regular character
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    return () => disposable.dispose();
  }, []);

  // --- Helpers ---

  function writePrompt(term: Terminal, cwd: string): void {
    const displayPath = cwd === '/Home' ? '~' : cwd.startsWith('/Home/') ? '~' + cwd.slice(4) : cwd;
    term.write(`\x1b[32m${displayPath}\x1b[0m \x1b[1;33m$\x1b[0m `);
  }

  function navigateHistory(term: Terminal, direction: number): void {
    const history = commandHistoryRef.current;
    if (history.length === 0) return;

    const newIndex = historyIndexRef.current + direction;

    if (newIndex < 0) {
      // Below oldest — show current input
      if (historyIndexRef.current >= 0) {
        clearCurrentLine(term);
        inputBufferRef.current = '';
        historyIndexRef.current = -1;
        writePrompt(term, cwdRef.current);
      }
      return;
    }

    if (newIndex >= history.length) {
      // Above newest — clear
      clearCurrentLine(term);
      inputBufferRef.current = '';
      historyIndexRef.current = history.length;
      writePrompt(term, cwdRef.current);
      return;
    }

    // Save current input when first navigating up
    if (historyIndexRef.current === -1) {
      // Save the current unsent input (not needed for basic impl)
    }

    historyIndexRef.current = newIndex;
    clearCurrentLine(term);
    inputBufferRef.current = history[newIndex];
    writePrompt(term, cwdRef.current);
    term.write(history[newIndex]);
  }

  function clearCurrentLine(term: Terminal): void {
    const promptLen = getPromptLength(cwdRef.current);
    term.write(`\r\x1b[${promptLen + 1}C\x1b[K`);
  }

  function getPromptLength(cwd: string): number {
    const displayPath = cwd === '/Home' ? '~' : cwd.startsWith('/Home/') ? '~' + cwd.slice(4) : cwd;
    return displayPath.length + 3; // "path $ "
  }

  async function handleTab(term: Terminal): Promise<void> {
    const completion = await tabComplete(inputBufferRef.current, cwdRef.current);
    if (!completion) return;

    if (completion.includes('  ')) {
      // Multiple matches — show them
      term.writeln('');
      term.writeln(completion);
      writePrompt(term, cwdRef.current);
      term.write(inputBufferRef.current);
    } else {
      // Single match — replace input
      clearCurrentLine(term);
      inputBufferRef.current = completion.trimEnd();
      writePrompt(term, cwdRef.current);
      term.write(inputBufferRef.current);
    }
  }

  async function handleEnter(term: Terminal): Promise<void> {
    const input = inputBufferRef.current;
    term.writeln('');

    if (input.trim()) {
      commandHistoryRef.current.push(input);
      historyIndexRef.current = commandHistoryRef.current.length;
      isRunningRef.current = true;

      try {
        await executeCommand(term, input);
      } catch (err) {
        term.writeln(`\x1b[31mError: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
      }

      isRunningRef.current = false;
    }

    inputBufferRef.current = '';
    historyIndexRef.current = commandHistoryRef.current.length;
    writePrompt(term, cwdRef.current);
  }

  async function executeCommand(term: Terminal, input: string): Promise<void> {
    const { command, args } = parseCommandLine(input);

    if (!command) return;

    if (command === 'clear') {
      term.clear();
      return;
    }

    // Dynamic import to avoid circular deps
    const { getCommand } = await import('./shell');
    const cmd = getCommand(command);

    if (!cmd) {
      term.writeln(`\x1b[31mcommand not found: ${command}\x1b[0m`);
      return;
    }

    const ctx: ShellContext = {
      get cwd() { return cwdRef.current; },
      setCwd(newCwd) { setCwd(newCwd); },
      write(data) { term.writeln(data); },
      writeError(data) { term.writeln(`\x1b[31m${data}\x1b[0m`); },
    };

    await cmd.execute(args, ctx);
  }

  // Copy/paste support
  const handleContainerClick = useCallback(() => {
    termRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onClick={handleContainerClick}
      style={{ padding: '4px' }}
    />
  );
}
