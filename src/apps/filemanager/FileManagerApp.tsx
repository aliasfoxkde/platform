import { useState, useEffect, useCallback } from 'react';
import { listDirectory, createDirectory, deletePath } from '@/storage';
import type { VFSEntry } from '@/storage';

type ViewMode = 'grid' | 'list';

const FAVORITES = [
  { label: 'Home', path: '/Home' },
  { label: 'Documents', path: '/Home/Documents' },
  { label: 'Downloads', path: '/Home/Downloads' },
  { label: 'Pictures', path: '/Home/Pictures' },
];

function getFileIcon(item: VFSEntry): string {
  if (item.type === 'directory') return '\u{1F4C1}';
  if (!item.mimeType) return '\u{1F4C4}';
  if (item.mimeType.startsWith('image/')) return '\u{1F5BC}\u{FE0F}';
  if (item.mimeType.includes('pdf')) return '\u{1F4C4}';
  if (item.mimeType.includes('text/') || item.mimeType.includes('typescript') || item.mimeType.includes('javascript'))
    return '\u{1F4DD}';
  if (item.mimeType.includes('zip') || item.mimeType.includes('octet')) return '\u{1F4E6}';
  if (item.mimeType.includes('csv')) return '\u{1F4CA}';
  return '\u{1F4C4}';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export default function FileManagerApp() {
  const [currentPath, setCurrentPath] = useState('/Home');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [items, setItems] = useState<VFSEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  /* Load directory contents */
  const loadDirectory = useCallback(async (path: string) => {
    try {
      setError(null);
      const entries = await listDirectory(path);
      setItems(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  const navigateTo = useCallback((name: string) => {
    const next = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setCurrentPath(next);
  }, [currentPath]);

  const handleNewFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      const path = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
      await createDirectory(path);
      setNewFolderName('');
      setShowNewFolder(false);
      loadDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [newFolderName, currentPath, loadDirectory]);

  const handleDelete = useCallback(async (name: string) => {
    try {
      const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      await deletePath(path);
      loadDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [currentPath, loadDirectory]);

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        {/* Breadcrumb */}
        <nav className="flex flex-1 items-center gap-1 text-[hsl(var(--muted-foreground))]">
          {pathParts.map((part, i) => {
            const segmentPath = '/' + pathParts.slice(0, i + 1).join('/');
            const isLast = i === pathParts.length - 1;
            return (
              <span key={segmentPath} className="flex items-center gap-1">
                {i > 0 && <span className="text-[hsl(var(--border-bright))]">/</span>}
                <button
                  onClick={() => setCurrentPath(segmentPath)}
                  className={`cursor-pointer rounded px-1 py-0.5 transition-colors duration-[var(--transition)] ${
                    isLast
                      ? 'font-medium text-[hsl(var(--foreground))]'
                      : 'hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </nav>

        {/* View toggle */}
        <div className="flex rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))]">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`cursor-pointer rounded-l-[var(--radius)] px-2 py-1 transition-colors duration-[var(--transition)] ${
              viewMode === 'grid'
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
              <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
              <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
              <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`cursor-pointer rounded-r-[var(--radius)] px-2 py-1 transition-colors duration-[var(--transition)] ${
              viewMode === 'list'
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="0.5" />
              <rect x="1" y="7" width="14" height="2" rx="0.5" />
              <rect x="1" y="12" width="14" height="2" rx="0.5" />
            </svg>
          </button>
        </div>

        {/* New folder button */}
        <button
          title="New folder"
          onClick={() => setShowNewFolder(true)}
          className="cursor-pointer rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-[hsl(var(--muted-foreground))] transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 4H8L7 2H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zM8.5 9H7v1.5a.5.5 0 01-1 0V9H4.5a.5.5 0 010-1H6V6.5a.5.5 0 011 0V8h1.5a.5.5 0 010 1z" />
          </svg>
        </button>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNewFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
            placeholder="Folder name..."
            className="flex-1 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"
            autoFocus
          />
          <button onClick={handleNewFolder} className="cursor-pointer rounded-[var(--radius)] bg-[hsl(var(--accent))] px-3 py-1 text-xs text-[hsl(var(--accent-foreground))] transition-colors duration-[var(--transition)] hover:opacity-90">
            Create
          </button>
          <button onClick={() => setShowNewFolder(false)} className="cursor-pointer rounded-[var(--radius)] border border-[hsl(var(--border))] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))]">
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-40 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Favorites
          </p>
          {FAVORITES.map((fav) => (
            <button
              key={fav.path}
              onClick={() => setCurrentPath(fav.path)}
              className={`mb-0.5 w-full cursor-pointer rounded-[var(--radius)] px-2 py-1.5 text-left text-xs transition-colors duration-[var(--transition)] ${
                currentPath === fav.path
                  ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {fav.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Error bar */}
          {error && (
            <div className="flex items-center gap-2 bg-[hsl(var(--destructive)/0.1)] px-3 py-1.5 text-xs text-[hsl(var(--destructive))]">
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="cursor-pointer opacity-70 hover:opacity-100">
                &times;
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                This folder is empty.
              </p>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1">
                {items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => item.type === 'directory' && navigateTo(item.name)}
                    onDoubleClick={() => {
                      /* open file (placeholder) */
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (confirm(`Delete "${item.name}"?`)) {
                        handleDelete(item.name);
                      }
                    }}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius)] p-2 text-center transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))]"
                    title={item.size ? `${item.name} - ${formatSize(item.size)}` : item.name}
                  >
                    <span className="text-3xl">{getFileIcon(item)}</span>
                    <span className="max-w-full truncate text-[11px] text-[hsl(var(--surface-foreground))]">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                    <th className="pb-1.5 font-medium">Name</th>
                    <th className="pb-1.5 font-medium">Size</th>
                    <th className="pb-1.5 font-medium">Modified</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.path}
                      onClick={() => item.type === 'directory' && navigateTo(item.name)}
                      className="cursor-pointer transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))]"
                    >
                      <td className="flex items-center gap-2 py-1.5">
                        <span className="text-base">{getFileIcon(item)}</span>
                        <span className="text-[hsl(var(--surface-foreground))]">
                          {item.name}
                        </span>
                      </td>
                      <td className="py-1.5 text-[hsl(var(--muted-foreground))]">
                        {item.size ? formatSize(item.size) : '--'}
                      </td>
                      <td className="py-1.5 text-[hsl(var(--muted-foreground))]">
                        {new Date(item.modified).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${item.name}"?`)) {
                              handleDelete(item.name);
                            }
                          }}
                          className="cursor-pointer rounded px-1 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity duration-[var(--transition)] hover:text-[hsl(var(--destructive))] group-hover:opacity-100 [&:hover]:opacity-100"
                          title="Delete"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H5.5l1-1h3l1 1h2.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
