import { useState, useRef, useEffect, useCallback } from "react";

interface TerminalLine {
  type: "output" | "input" | "error";
  text: string;
}

const WELCOME: TerminalLine[] = [
  { type: "output", text: "WebOS Terminal v0.1.0" },
  { type: "output", text: "Type 'help' for available commands.\n" },
];

const COMMANDS: Record<string, string> = {
  help: `Available commands:
  help    - Show this help message
  clear   - Clear the terminal
  echo    - Echo arguments
  date    - Show current date and time
  whoami  - Show current user
  uname   - Show system information
  ls      - List files (mock)
  pwd     - Print working directory`,
  whoami: "webos-user",
  uname: "WebOS 0.1.0 - A programmable, multimodal, AI-controllable runtime platform",
  pwd: "/home/webos-user",
  ls: "Documents  Downloads  Pictures  readme.txt  notes.md",
};

export default function TerminalApp() {
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  /* Focus input on mount */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const processCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    const parts = trimmed.split(/\s+/);
    const command = parts[0]?.toLowerCase() ?? "";
    const args = parts.slice(1).join(" ");

    const newLines: TerminalLine[] = [
      { type: "input", text: `$ ${trimmed}` },
    ];

    if (!command) {
      // Empty input
    } else if (command === "clear") {
      setLines([]);
      return;
    } else if (command === "echo") {
      newLines.push({ type: "output", text: args || "" });
    } else if (command === "date") {
      newLines.push({
        type: "output",
        text: new Date().toLocaleString(),
      });
    } else if (COMMANDS[command]) {
      newLines.push({ type: "output", text: COMMANDS[command] });
    } else {
      newLines.push({
        type: "error",
        text: `command not found: ${command}`,
      });
    }

    setLines((prev) => [...prev, ...newLines]);
    if (trimmed) {
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        processCommand(input);
        setInput("");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length === 0) return;
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex === -1) return;
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      } else if (e.key === "l" && e.ctrlKey) {
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
              line.type === "input"
                ? "text-[#c0c0c0]"
                : line.type === "error"
                  ? "text-[#f87171]"
                  : "text-[#e0e0e0]"
            }`}
          >
            {line.text}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center leading-relaxed">
          <span className="shrink-0 text-[#22c55e]">$ </span>
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
