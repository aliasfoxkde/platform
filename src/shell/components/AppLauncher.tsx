import { useCallback, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useWindowStore } from '../stores/windowStore';
import clsx from 'clsx';
import type { AppCategory } from '../types';

type FilterCategory = 'all' | AppCategory;

const CATEGORY_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'system', label: 'System' },
  { id: 'development', label: 'Development' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'media', label: 'Media' },
  { id: 'games', label: 'Games' },
];

export function AppLauncher() {
  const apps = useAppStore((s) => s.apps);
  const openWindow = useWindowStore((s) => s.openWindow);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredApps = useMemo(() => {
    let result = apps;
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [apps, activeCategory, query]);

  const handleAppClick = useCallback(
    (appId: string) => {
      openWindow(appId);
      setIsOpen(false);
    },
    [openWindow],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [],
  );

  // Focus input when opened
  useMemo(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-app-launcher-overlay
      className="fixed inset-0 z-[9800] flex items-center justify-center"
      onClick={() => setIsOpen(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[hsl(var(--background)/0.4)] backdrop-blur-sm" />

      {/* Panel */}
      <div
        data-app-launcher
        className={clsx(
          'relative w-full max-w-2xl max-h-[70vh]',
          'glass-heavy rounded-2xl',
          'shadow-2xl shadow-black/30',
          'overflow-hidden',
          'flex flex-col',
          'animate-[scaleIn_150ms_ease-out]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
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
                'w-full pl-10 pr-4 py-2.5 rounded-xl',
                'bg-[hsl(var(--muted)/0.3)]',
                'border border-[hsl(var(--border)/0.4)]',
                'text-sm text-[hsl(var(--foreground))]',
                'placeholder:text-[hsl(var(--muted-foreground))]',
                'outline-none',
                'focus:border-[hsl(var(--accent)/0.5)]',
                'transition-colors duration-150',
              )}
              placeholder="Search applications..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                'transition-colors duration-100 cursor-default',
                activeCategory === tab.id
                  ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface)/0.5)]',
              )}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* App Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm">No applications found</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {filteredApps.map((app) => {
                const isEmoji = app.icon.length <= 4;
                return (
                  <button
                    key={app.id}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-3 rounded-xl',
                      'hover:bg-[hsl(var(--accent)/0.1)]',
                      'transition-colors duration-100',
                      'cursor-default',
                      'focus-visible:outline-2 focus-visible:outline-[hsl(var(--accent))]',
                    )}
                    onClick={() => handleAppClick(app.id)}
                    title={app.title}
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[hsl(var(--surface)/0.5)]">
                      {isEmoji ? (
                        <span className="text-2xl">{app.icon}</span>
                      ) : (
                        <img
                          src={app.icon}
                          alt={app.title}
                          className="w-8 h-8 object-contain"
                          draggable={false}
                        />
                      )}
                    </div>
                    <span className="text-xs text-[hsl(var(--foreground))] text-center leading-tight truncate w-full">
                      {app.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
