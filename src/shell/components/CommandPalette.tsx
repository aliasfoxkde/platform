import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';
import clsx from 'clsx';

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const query = useCommandPaletteStore((s) => s.query);
  const selectedIndex = useCommandPaletteStore((s) => s.selectedIndex);
  const close = useCommandPaletteStore((s) => s.close);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const setSelectedIndex = useCommandPaletteStore((s) => s.setSelectedIndex);
  const selectNext = useCommandPaletteStore((s) => s.selectNext);
  const selectPrevious = useCommandPaletteStore((s) => s.selectPrevious);
  const executeSelected = useCommandPaletteStore((s) => s.executeSelected);
  const getFilteredCommands = useCommandPaletteStore((s) => s.getFilteredCommands);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => getFilteredCommands(), [query, isOpen, getFilteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || filteredCommands.length === 0) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-command-item]');
    const selected = items[selectedIndex];
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filteredCommands.length]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPrevious();
          break;
        case 'Enter': {
          e.preventDefault();
          executeSelected();
          break;
        }
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [filteredCommands, selectedIndex, selectNext, selectPrevious, executeSelected, close],
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (index === selectedIndex) {
        executeSelected();
      } else {
        setSelectedIndex(index);
      }
    },
    [selectedIndex, setSelectedIndex, executeSelected],
  );

  if (!isOpen) return null;

  return (
    <div
      data-command-palette-overlay
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[20vh]"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[hsl(var(--background)/0.5)] backdrop-blur-sm" />

      {/* Panel */}
      <div
        data-command-palette
        className={clsx(
          'relative w-full max-w-lg',
          'glass-heavy rounded-xl',
          'shadow-2xl shadow-black/30',
          'overflow-hidden',
          'flex flex-col',
          'max-h-[60vh]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border)/0.4)]">
          <svg
            className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={clsx(
              'flex-1 bg-transparent border-none outline-none',
              'text-sm text-[hsl(var(--foreground))]',
              'placeholder:text-[hsl(var(--muted-foreground))]',
            )}
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.4)]">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="overflow-y-auto py-1.5"
          role="listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                data-command-item
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-2 text-sm',
                  'transition-colors duration-75',
                  'cursor-default',
                  index === selectedIndex
                    ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--surface-foreground))] hover:bg-[hsl(var(--surface)/0.5)]',
                )}
                onClick={() => handleSelect(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <span className="flex-1 text-left">{cmd.label}</span>
                {cmd.category && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {cmd.category}
                  </span>
                )}
                {cmd.shortcut && (
                  <kbd className="flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.4)]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[hsl(var(--border)/0.4)] text-[0.65rem] text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.4)] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.4)] font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.4)] font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
