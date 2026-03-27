/**
 * Browser-in-Browser — sandboxed iframe browser with tabs, bookmarks, and navigation.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  addedAt: number;
}

interface HistoryEntry {
  url: string;
  title: string;
  visitedAt: number;
}

const HOME_URL = 'https://www.wikipedia.org';

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: '1', title: 'Wikipedia', url: 'https://www.wikipedia.org', addedAt: Date.now() },
  { id: '2', title: 'GitHub', url: 'https://github.com', addedAt: Date.now() },
  { id: '3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', addedAt: Date.now() },
];

// ---------------------------------------------------------------------------
// Browser App
// ---------------------------------------------------------------------------

export default function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    {
      id: crypto.randomUUID(),
      url: HOME_URL,
      title: 'New Tab',
      loading: false,
      canGoBack: false,
      canGoForward: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [urlInput, setUrlInput] = useState(HOME_URL);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Sync URL input when active tab changes
  useEffect(() => {
    setUrlInput(activeTab.url);
  }, [activeTabId, activeTab.url]);

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  const createTab = useCallback(
    (url = HOME_URL) => {
      const newTab: Tab = {
        id: crypto.randomUUID(),
        url,
        title: 'Loading...',
        loading: true,
        canGoBack: false,
        canGoForward: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setUrlInput(url);
    },
    [],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = prev.filter((t) => t.id !== tabId);
        if (tabId === activeTabId) {
          const newActive = next[Math.min(idx, next.length - 1)];
          setActiveTabId(newActive.id);
        }
        return next;
      });
    },
    [activeTabId],
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const navigate = useCallback(
    (url: string) => {
      let resolved = url.trim();
      if (!resolved) return;

      // Add protocol if missing
      if (!/^https?:\/\//i.test(resolved)) {
        // Check if it looks like a domain
        if (/\.\w{2,}/.test(resolved)) {
          resolved = 'https://' + resolved;
        } else {
          resolved = `https://www.google.com/search?igu=1&q=${encodeURIComponent(resolved)}`;
        }
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url: resolved, title: 'Loading...', loading: true }
            : t,
        ),
      );
      setUrlInput(resolved);

      // Add to history
      setHistory((prev) => [
        { url: resolved, title: resolved, visitedAt: Date.now() },
        ...prev.slice(0, 99),
      ]);
    },
    [activeTabId],
  );

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate(urlInput);
    },
    [urlInput, navigate],
  );

  const goBack = useCallback(() => {
    const iframe = iframeRefs.current[activeTabId];
    try {
      iframe?.contentWindow?.history.back();
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, canGoBack: true, canGoForward: true } : t,
        ),
      );
    } catch {
      // cross-origin
    }
  }, [activeTabId]);

  const goForward = useCallback(() => {
    const iframe = iframeRefs.current[activeTabId];
    try {
      iframe?.contentWindow?.history.forward();
    } catch {
      // cross-origin
    }
  }, [activeTabId]);

  const refresh = useCallback(() => {
    const iframe = iframeRefs.current[activeTabId];
    if (iframe) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, loading: true } : t,
        ),
      );
      iframe.src = iframe.src;
    }
  }, [activeTabId]);

  const goHome = useCallback(() => {
    navigate(HOME_URL);
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------

  const isBookmarked = bookmarks.some((b) => b.url === activeTab.url);

  const toggleBookmark = useCallback(() => {
    if (isBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b.url !== activeTab.url));
    } else {
      setBookmarks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: activeTab.title || activeTab.url,
          url: activeTab.url,
          addedAt: Date.now(),
        },
      ]);
    }
  }, [isBookmarked, activeTab]);

  // ---------------------------------------------------------------------------
  // Iframe load handler
  // ---------------------------------------------------------------------------

  const handleIframeLoad = useCallback(
    (tabId: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, loading: false, title: t.url }
            : t,
        ),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface))] text-[hsl(var(--text))]">
      {/* Tab bar */}
      <div className="flex items-center bg-[hsl(var(--surface-secondary))] border-b border-[hsl(var(--border))] overflow-x-auto px-1 pt-1 gap-0.5 shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer min-w-[120px] max-w-[200px] text-sm group transition-colors ${
              tab.id === activeTabId
                ? 'bg-[hsl(var(--surface))] text-[hsl(var(--text))]'
                : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))]/50'
            }`}
          >
            {tab.loading ? (
              <span className="w-3 h-3 border-2 border-[hsl(var(--text-secondary))] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            )}
            <span className="truncate flex-1">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-[hsl(var(--destructive))] hover:text-white rounded p-0.5 text-xs transition-all"
              >
                x
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => createTab()}
          className="px-2 py-1 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--surface))]/50 rounded text-lg transition-colors ml-1"
          title="New tab"
        >
          +
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[hsl(var(--surface-secondary))] border-b border-[hsl(var(--border))] shrink-0">
        {/* Navigation buttons */}
        <button onClick={goBack} className="toolbar-btn" title="Back" disabled={!activeTab.canGoBack}>
          <ChevronLeftIcon />
        </button>
        <button onClick={goForward} className="toolbar-btn" title="Forward" disabled={!activeTab.canGoForward}>
          <ChevronRightIcon />
        </button>
        <button
          onClick={refresh}
          className="toolbar-btn"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
        <button onClick={goHome} className="toolbar-btn" title="Home">
          <HomeIcon />
        </button>

        {/* URL bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 mx-1">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full px-3 py-1 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--text-secondary))] focus:outline-none focus:border-[hsl(var(--accent))] transition-colors"
            placeholder="Search or enter URL..."
          />
        </form>

        {/* Bookmark button */}
        <button onClick={toggleBookmark} className="toolbar-btn" title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}>
          {isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
        </button>

        {/* Bookmarks panel toggle */}
        <button
          onClick={() => { setShowBookmarks(!showBookmarks); setShowHistory(false); }}
          className={`toolbar-btn ${showBookmarks ? 'text-[hsl(var(--accent))]' : ''}`}
          title="Bookmarks"
        >
          <BookmarkListIcon />
        </button>

        {/* History panel toggle */}
        <button
          onClick={() => { setShowHistory(!showHistory); setShowBookmarks(false); }}
          className={`toolbar-btn ${showHistory ? 'text-[hsl(var(--accent))]' : ''}`}
          title="History"
        >
          <HistoryIcon />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Iframes */}
        {tabs.map((tab) => (
          <iframe
            key={tab.id}
            ref={(el) => { iframeRefs.current[tab.id] = el; }}
            src={tab.url}
            onLoad={() => handleIframeLoad(tab.id)}
            className={`absolute inset-0 w-full h-full border-0 bg-white ${
              tab.id === activeTabId ? 'visible' : 'invisible'
            }`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            title={tab.title}
          />
        ))}

        {/* Loading overlay */}
        {activeTab.loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[hsl(var(--surface-secondary))] z-10">
            <div className="h-full bg-[hsl(var(--accent))] animate-loading-bar" />
          </div>
        )}

        {/* Bookmarks panel */}
        {showBookmarks && (
          <Panel title="Bookmarks" onClose={() => setShowBookmarks(false)}>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-secondary))] p-4">No bookmarks yet</p>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {bookmarks.map((bm) => (
                  <li key={bm.id}>
                    <button
                      onClick={() => { navigate(bm.url); setShowBookmarks(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[hsl(var(--surface-secondary))] transition-colors"
                    >
                      <div className="text-sm font-medium truncate">{bm.title}</div>
                      <div className="text-xs text-[hsl(var(--text-secondary))] truncate">{bm.url}</div>
                    </button>
                    <button
                      onClick={() => setBookmarks((prev) => prev.filter((b) => b.id !== bm.id))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--destructive))] transition-colors"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* History panel */}
        {showHistory && (
          <Panel title="History" onClose={() => setShowHistory(false)}>
            {history.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-secondary))] p-4">No browsing history</p>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {history.slice(0, 50).map((entry, i) => (
                  <li key={i}>
                    <button
                      onClick={() => { navigate(entry.url); setShowHistory(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[hsl(var(--surface-secondary))] transition-colors"
                    >
                      <div className="text-sm truncate">{entry.url}</div>
                      <div className="text-xs text-[hsl(var(--text-secondary))]">
                        {new Date(entry.visitedAt).toLocaleTimeString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center px-3 py-1 text-xs text-[hsl(var(--text-secondary))] bg-[hsl(var(--surface-secondary))] border-t border-[hsl(var(--border))] shrink-0">
        <span className="truncate">{activeTab.loading ? 'Loading...' : activeTab.url}</span>
        <span className="ml-auto">{tabs.length} tab{tabs.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side Panel
// ---------------------------------------------------------------------------

function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-[hsl(var(--surface))] border-l border-[hsl(var(--border))] z-20 flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))]">
        <span className="text-sm font-medium">{title}</span>
        <button onClick={onClose} className="text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] text-lg">
          x
        </button>
      </div>
      <div className="flex-1 overflow-y-auto relative">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function toolbarBtnClass(disabled = false) {
  return `p-1.5 rounded hover:bg-[hsl(var(--surface-secondary))] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] transition-colors ${
    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
  }`;
}

// eslint-disable-next-line react-refresh/only-export-components
export function ToolbarButton({
  children,
  title,
  disabled,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${toolbarBtnClass(disabled)} ${active ? 'text-[hsl(var(--accent))]' : ''}`}
    >
      {children}
    </button>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12L6 8L10 4" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4L10 8L6 12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M13.5 2.5V8H8" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8L8 2L14 8" />
      <path d="M3 7V13.5H6.5V9.5H9.5V13.5H13V7" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2H13V14L8 11L3 14V2Z" />
    </svg>
  );
}

function BookmarkFilledIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <path d="M3 2H13V14L8 11L3 14V2Z" />
    </svg>
  );
}

function BookmarkListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2H13V14L8 11L3 14V2Z" />
      <path d="M5 5H8" />
      <path d="M5 7.5H8" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5V8L10.5 9.5" />
    </svg>
  );
}
