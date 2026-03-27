import { useState, useRef, useEffect, useCallback } from 'react';
import { listDirectory, readFile, writeFile, createDirectory, deletePath, exists } from '@/storage';

interface TerminalLine {
  type: 'output' | 'input' | 'error';
  text: string;
}

const WELCOME: TerminalLine[] = [
  { type: 'output', text: 'WebOS Terminal v0.2.0' },
  { type: 'output', text: 'Type \'help\' for available commands.\n' },
];

export default function TerminalApp() {
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/Home');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  /* Focus input on mount */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resolvePath = useCallback((path: string): string => {
    if (path.startsWith('/')) return path;
    if (path === '..') {
      const parts = cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    if (path.startsWith('./')) path = path.slice(2);
    const parts = path.split('/');
    const result = cwd === '/' ? [''] : cwd.split('/');
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part && part !== '.') {
        result.push(part);
      }
    }
    return result.join('/') || '/';
  }, [cwd]);

  const processCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    const parts = trimmed.split(/\s+/);
    const command = parts[0]?.toLowerCase() ?? '';
    const args = parts.slice(1);

    const newLines: TerminalLine[] = [
      { type: 'input', text: `${cwd} $ ${trimmed}` },
    ];

    if (!command) {
      // Empty input
    } else if (command === 'clear') {
      setLines([]);
      return;
    } else if (command === 'help') {
      newLines.push({ type: 'output', text: `Available commands:
  help       Show this help message
  clear      Clear the terminal
  echo       Echo arguments
  date       Show current date and time
  whoami     Show current user
  uname      Show system information
  pwd        Print working directory
  cd [path]  Change directory
  ls [path]  List directory contents
  cat <file> Show file contents
  mkdir <dir> Create directory
  touch <file> Create empty file
  rm <path>  Delete file or directory` });
    } else if (command === 'echo') {
      newLines.push({ type: 'output', text: args.join(' ') });
    } else if (command === 'date') {
      newLines.push({ type: 'output', text: new Date().toLocaleString() });
    } else if (command === 'whoami') {
      newLines.push({ type: 'output', text: 'webos-user' });
    } else if (command === 'uname') {
      newLines.push({ type: 'output', text: 'WebOS 0.2.0 - A programmable, multimodal, AI-controllable runtime platform' });
    } else if (command === 'pwd') {
      newLines.push({ type: 'output', text: cwd });
    } else if (command === 'cd') {
      const target = args[0] ? resolvePath(args[0]) : '/Home';
      if (await exists(target)) {
        setCwd(target);
      } else {
        newLines.push({ type: 'error', text: `cd: no such directory: ${args[0] ?? '/'}` });
      }
    } else if (command === 'ls') {
      try {
        const target = args[0] ? resolvePath(args[0]) : cwd;
        const entries = await listDirectory(target);
        if (entries.length === 0) {
          newLines.push({ type: 'output', text: '(empty)' });
        } else {
          const plain = entries.map((e) => (e.type === 'directory' ? `${e.name}/` : e.name));
          newLines.push({ type: 'output', text: plain.join('  ') });
        }
      } catch (err) {
        newLines.push({ type: 'error', text: `ls: ${err instanceof Error ? err.message : String(err)}` });
      }
    } else if (command === 'cat') {
      if (!args[0]) {
        newLines.push({ type: 'error', text: 'cat: missing file operand' });
      } else {
        try {
          const target = resolvePath(args[0]);
          const content = await readFile(target);
          newLines.push({ type: 'output', text: content });
        } catch (err) {
          newLines.push({ type: 'error', text: `cat: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } else if (command === 'mkdir') {
      if (!args[0]) {
        newLines.push({ type: 'error', text: 'mkdir: missing operand' });
      } else {
        try {
          const target = resolvePath(args[0]);
          await createDirectory(target);
        } catch (err) {
          newLines.push({ type: 'error', text: `mkdir: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } else if (command === 'touch') {
      if (!args[0]) {
        newLines.push({ type: 'error', text: 'touch: missing file operand' });
      } else {
        try {
          const target = resolvePath(args[0]);
          if (!(await exists(target))) {
            await writeFile(target, '');
          }
        } catch (err) {
          newLines.push({ type: 'error', text: `touch: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } else if (command === 'rm') {
      if (!args[0]) {
        newLines.push({ type: 'error', text: 'rm: missing operand' });
      } else {
        try {
          const target = resolvePath(args[0]);
          await deletePath(target);
        } catch (err) {
          newLines.push({ type: 'error', text: `rm: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } else {
      newLines.push({
        type: 'error',
        text: `command not found: ${command}`,
      });
    }

    setLines((prev) => [...prev, ...newLines]);
    if (trimmed) {
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    }
  }, [cwd, resolvePath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        processCommand(input);
        setInput('');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length === 0) return;
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex === -1) return;
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        setLines([]);
      }
    },
    [input, processCommand, commandHistory, historyIndex],
  );

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#0d0d0d] font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap leading-relaxed ${
              line.type === 'input'
                ? 'text-[#c0c0c0]'
                : line.type === 'error'
                  ? 'text-[#f87171]'
                  : 'text-[#e0e0e0]'
            }`}
          >
            {line.text}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center leading-relaxed">
          <span className="shrink-0 text-[#22c55e]">{cwd} $ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-sm text-[#e0e0e0] outline-none"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
