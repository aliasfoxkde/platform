import { useState, useCallback, useRef, useEffect } from "react";
import { TabBar } from "@/ui/components";
import { Icon } from "@/ui/icons";

interface EditorTab {
  id: string;
  name: string;
  content: string;
  modified: boolean;
}

const DEFAULT_TABS: EditorTab[] = [
  { id: "tab-1", name: "untitled-1.txt", content: "", modified: false },
];

export default function EditorApp() {
  const [tabs, setTabs] = useState<EditorTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  function updateTabContent(id: string, content: string) {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, content, modified: content !== "" } : t,
      ),
    );
  }

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateTabContent(activeTabId, e.target.value);
    },
    [activeTabId],
  );

  /* Count lines / cursor position */
  const lines = activeTab.content.split("\n");
  const totalLines = lines.length;

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  function updateCursorPosition() {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const textBefore = el.value.substring(0, pos);
    const lineIndex = textBefore.split("\n").length;
    const colIndex = pos - textBefore.lastIndexOf("\n");
    setCursorLine(lineIndex);
    setCursorCol(colIndex);
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      updateCursorPosition();
    }
  }, [activeTabId]);

  /* Sync scroll between line numbers and textarea */
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  /* Keyboard shortcut: Tab inserts spaces */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newContent =
          activeTab.content.substring(0, start) +
          "  " +
          activeTab.content.substring(end);
        updateTabContent(activeTabId, newContent);
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
    },
    [activeTabId, activeTab.content],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center">
        <TabBar
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.name,
            modified: tab.modified,
          }))}
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
        />
        <button
          title="New tab"
          className="cursor-pointer px-2 py-1.5 text-xs text-[hsl(var(--muted-foreground))] transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--surface-bright))] hover:text-[hsl(var(--foreground))]"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      {/* Editor area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div
          className="shrink-0 select-none overflow-hidden border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] py-2 text-right font-mono text-xs leading-[1.5rem] text-[hsl(var(--muted-foreground))]"
          style={{ width: "3rem" }}
        >
          <div style={{ transform: `translateY(-${scrollTop}px)` }}>
            {Array.from({ length: totalLines }, (_, i) => (
              <div key={i} className="pr-2">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={activeTab.content}
          onChange={handleInput}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-2 font-mono text-xs leading-[1.5rem] text-[hsl(var(--foreground))] outline-none"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1 text-[10px] text-[hsl(var(--muted-foreground))]">
        <div className="flex items-center gap-3">
          <span>
            Ln {cursorLine}, Col {cursorCol}
          </span>
          <span>{totalLines} lines</span>
        </div>
        <span>Plain Text</span>
      </div>
    </div>
  );
}
