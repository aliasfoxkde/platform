import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClipboardEntry {
  id: string;
  content: string;
  type: 'text' | 'image';
  pinned: boolean;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY = 100;
const STORAGE_KEY = 'webos-clipboard-history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return d.toLocaleDateString();
}

function truncateContent(content: string, maxLen: number = 120): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '...';
}

function loadHistory(): ClipboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClipboardEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: ClipboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClipboardApp() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'recent'>('all');
  const initRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load history on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setEntries(loadHistory());
  }, []);

  // Poll clipboard for changes (every 2s)
  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) return;
        setEntries((prev) => {
          // Skip if the latest entry already has this content
          if (prev.length > 0 && prev[0].content === text) return prev;
          // Skip if any entry has this content (dedup)
          if (prev.some((e) => e.content === text)) return prev;

          const newEntry: ClipboardEntry = {
            id: generateId(),
            content: text,
            type: 'text',
            pinned: false,
            timestamp: Date.now(),
          };
          const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
          saveHistory(updated);
          return updated;
        });
      } catch {
        // Clipboard permission denied or unavailable
      }
    }, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Persist on change
  useEffect(() => {
    if (initRef.current) {
      saveHistory(entries);
    }
  }, [entries]);

  const copyToClipboard = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  const handleCopy = useCallback(async (entry: ClipboardEntry) => {
    await copyToClipboard(entry.content);
  }, [copyToClipboard]);

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setEntries((prev) => prev.filter((e) => e.pinned));
  }, []);

  const handlePin = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, pinned: !e.pinned } : e,
      ),
    );
  }, []);

  const handlePasteNew = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      setEntries((prev) => {
        if (prev.some((e) => e.content === text)) return prev;
        const newEntry: ClipboardEntry = {
          id: generateId(),
          content: text,
          type: 'text',
          pinned: false,
          timestamp: Date.now(),
        };
        const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });
    } catch {
      // Permission denied
    }
  }, []);

  // Filtered entries
  const filteredEntries = (() => {
    let result = entries;

    if (filter === 'pinned') {
      result = result.filter((e) => e.pinned);
    } else if (filter === 'recent') {
      const oneHourAgo = Date.now() - 3600000;
      result = result.filter((e) => e.timestamp > oneHourAgo);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.content.toLowerCase().includes(q));
    }

    return result;
  })();

  const pinnedEntries = entries.filter((e) => e.pinned);
  const unpinnedEntries = entries.filter((e) => !e.pinned);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-36 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
        />

        {/* Filter tabs */}
        {(['all', 'pinned', 'recent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer rounded-md px-2 py-1 text-xs capitalize ${
              filter === f
                ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {f}
            {f === 'pinned' && pinnedEntries.length > 0 && (
              <span className="ml-1 text-[9px]">({pinnedEntries.length})</span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
          {entries.length}/{MAX_HISTORY}
        </span>

        <button
          onClick={handleClearAll}
          disabled={unpinnedEntries.length === 0}
          className="cursor-pointer rounded-md px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {searchQuery
                  ? 'No matches'
                  : filter === 'pinned'
                    ? 'No pinned items'
                    : filter === 'recent'
                      ? 'No recent items'
                      : 'Clipboard is empty'}
              </p>
              {!searchQuery && filter === 'all' && (
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                  Copy text anywhere to see it here
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry) => (
              <ClipboardItem
                key={entry.id}
                entry={entry}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
        <button
          onClick={handlePasteNew}
          className="w-full cursor-pointer rounded-md border border-dashed border-[hsl(var(--border))] bg-transparent px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))] transition-colors duration-100 hover:border-[hsl(var(--accent)/0.5)] hover:text-[hsl(var(--accent))]"
        >
          + Capture Current Clipboard
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clipboard Item
// ---------------------------------------------------------------------------

function ClipboardItem({
  entry,
  onCopy,
  onDelete,
  onPin,
}: {
  entry: ClipboardEntry;
  onCopy: (entry: ClipboardEntry) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await onCopy(entry);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isLong = entry.content.length > 120;

  return (
    <div className="group rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] transition-colors duration-100 hover:border-[hsl(var(--border))/80]">
      <div className="flex items-start gap-2 p-2">
        {/* Pin icon */}
        <button
          onClick={() => onPin(entry.id)}
          className="mt-0.5 cursor-pointer shrink-0 transition-colors duration-100"
          title={entry.pinned ? 'Unpin' : 'Pin'}
        >
          {entry.pinned ? (
            <svg className="h-3.5 w-3.5 text-[hsl(var(--accent))]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.828.722a.5.5 0 01.354 0l.707.707a.5.5 0 010 .707l-1.414 1.414a.5.5 0 01-.707 0L8 2.677 6.232 4.445a.5.5 0 01-.707 0l-.707-.707a.5.5 0 010-.707L5.636 1.828a2 2 0 012.828 0zM5.5 6v6.5a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5h1a.5.5 0 01.5.5zm5 0v6.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5h1a.5.5 0 01.5.5z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.828.722a.5.5 0 01.354 0l.707.707a.5.5 0 010 .707l-1.414 1.414a.5.5 0 01-.707 0L8 2.677 6.232 4.445a.5.5 0 01-.707 0l-.707-.707a.5.5 0 010-.707L5.636 1.828a2 2 0 012.828 0z" />
              <path d="M5.5 6v6.5M10.5 6v6.5" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleCopy}
          title="Click to copy"
        >
          <div className="text-xs text-[hsl(var(--foreground))] break-all whitespace-pre-wrap">
            {expanded || !isLong
              ? entry.content
              : truncateContent(entry.content)}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
              {formatTimestamp(entry.timestamp)}
            </span>
            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
              {entry.content.length} chars
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="cursor-pointer rounded px-1 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="cursor-pointer rounded px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors duration-100"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="cursor-pointer rounded px-1 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors duration-100"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
