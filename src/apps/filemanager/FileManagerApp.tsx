import { useState, useCallback } from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface FSItem {
  name: string;
  type: "folder" | "file";
  mimeType?: string;
  size?: number;
  modified?: string;
}

interface FSFolder {
  name: string;
  children: FSItem[];
}

type ViewMode = "grid" | "list";

/* -------------------------------------------------------------------------- */
/* Mock filesystem                                                             */
/* -------------------------------------------------------------------------- */

const FILESYSTEM: FSFolder[] = [
  {
    name: "/Home",
    children: [
      { name: "Documents", type: "folder" },
      { name: "Downloads", type: "folder" },
      { name: "Pictures", type: "folder" },
      { name: "readme.txt", type: "file", mimeType: "text/plain", size: 1024, modified: "2026-03-25" },
      { name: "notes.md", type: "file", mimeType: "text/markdown", size: 2048, modified: "2026-03-26" },
    ],
  },
  {
    name: "/Home/Documents",
    children: [
      { name: "Projects", type: "folder" },
      { name: "report.pdf", type: "file", mimeType: "application/pdf", size: 524288, modified: "2026-03-20" },
      { name: "todo.txt", type: "file", mimeType: "text/plain", size: 512, modified: "2026-03-27" },
      { name: "budget.csv", type: "file", mimeType: "text/csv", size: 8192, modified: "2026-03-22" },
    ],
  },
  {
    name: "/Home/Downloads",
    children: [
      { name: "photo.jpg", type: "file", mimeType: "image/jpeg", size: 2097152, modified: "2026-03-24" },
      { name: "archive.zip", type: "file", mimeType: "application/zip", size: 10485760, modified: "2026-03-21" },
      { name: "setup.dmg", type: "file", mimeType: "application/octet-stream", size: 52428800, modified: "2026-03-19" },
    ],
  },
  {
    name: "/Home/Pictures",
    children: [
      { name: "Vacation", type: "folder" },
      { name: "wallpaper.png", type: "file", mimeType: "image/png", size: 3145728, modified: "2026-03-18" },
    ],
  },
  {
    name: "/Home/Documents/Projects",
    children: [
      { name: "webos", type: "folder" },
      { name: "api-server.ts", type: "file", mimeType: "text/typescript", size: 4096, modified: "2026-03-27" },
      { name: "index.html", type: "file", mimeType: "text/html", size: 1536, modified: "2026-03-26" },
      { name: "styles.css", type: "file", mimeType: "text/css", size: 2048, modified: "2026-03-26" },
    ],
  },
  {
    name: "/Home/Pictures/Vacation",
    children: [
      { name: "beach.jpg", type: "file", mimeType: "image/jpeg", size: 4194304, modified: "2026-02-15" },
      { name: "sunset.jpg", type: "file", mimeType: "image/jpeg", size: 3670016, modified: "2026-02-15" },
    ],
  },
];

const FAVORITES = [
  { label: "Home", path: "/Home" },
  { label: "Documents", path: "/Home/Documents" },
  { label: "Downloads", path: "/Home/Downloads" },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getFileIcon(item: FSItem): string {
  if (item.type === "folder") return "\u{1F4C1}";
  if (!item.mimeType) return "\u{1F4C4}";
  if (item.mimeType.startsWith("image/")) return "\u{1F5BC}\u{FE0F}";
  if (item.mimeType.includes("pdf")) return "\u{1F4C4}";
  if (item.mimeType.includes("text/") || item.mimeType.includes("typescript") || item.mimeType.includes("javascript"))
    return "\u{1F4DD}";
  if (item.mimeType.includes("zip") || item.mimeType.includes("octet")) return "\u{1F4E6}";
  if (item.mimeType.includes("csv")) return "\u{1F4CA}";
  return "\u{1F4C4}";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function getFolder(path: string): FSFolder | undefined {
  return FILESYSTEM.find((f) => f.name === path);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function FileManagerApp() {
  const [currentPath, setCurrentPath] = useState("/Home");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const folder = getFolder(currentPath);
  const items = folder?.children ?? [];

  const navigateTo = useCallback(
    (name: string) => {
      const next = currentPath === "/Home" ? `/Home/${name}` : `${currentPath}/${name}`;
      const target = getFolder(next);
      if (target) {
        setCurrentPath(next);
      }
    },
    [currentPath],
  );

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        {/* Breadcrumb */}
        <nav className="flex flex-1 items-center gap-1 text-[hsl(var(--muted-foreground))]">
          {pathParts.map((part, i) => {
            const segmentPath = "/" + pathParts.slice(0, i + 1).join("/");
            const isLast = i === pathParts.length - 1;
            return (
              <span key={segmentPath} className="flex items-center gap-1">
                {i > 0 && <span className="text-[hsl(var(--border-bright))]">/</span>}
                <button
                  onClick={() => setCurrentPath(segmentPath)}
                  className={`cursor-pointer rounded px-1 py-0.5 transition-colors duration-[var(--transition)] ${
                    isLast
                      ? "font-medium text-[hsl(var(--foreground))]"
                      : "hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
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
            onClick={() => setViewMode("grid")}
            title="Grid view"
            className={`cursor-pointer rounded-l-[var(--radius)] px-2 py-1 transition-colors duration-[var(--transition)] ${
              viewMode === "grid"
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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
            onClick={() => setViewMode("list")}
            title="List view"
            className={`cursor-pointer rounded-r-[var(--radius)] px-2 py-1 transition-colors duration-[var(--transition)] ${
              viewMode === "list"
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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
          className="cursor-pointer rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-[hsl(var(--muted-foreground))] transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 4H8L7 2H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zM8.5 9H7v1.5a.5.5 0 01-1 0V9H4.5a.5.5 0 010-1H6V6.5a.5.5 0 011 0V8h1.5a.5.5 0 010 1z" />
          </svg>
        </button>
      </div>

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
                  ? "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {fav.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              This folder is empty.
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1">
              {items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => item.type === "folder" && navigateTo(item.name)}
                  onDoubleClick={() => {
                    /* open file (placeholder) */
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius)] p-2 text-center transition-colors duration-[var(--transition)] ${
                    item.type === "folder"
                      ? "hover:bg-[hsl(var(--muted))]"
                      : "hover:bg-[hsl(var(--muted))]"
                  }`}
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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.name}
                    onClick={() => item.type === "folder" && navigateTo(item.name)}
                    className={`cursor-pointer transition-colors duration-[var(--transition)] hover:bg-[hsl(var(--muted))] ${
                      item.type === "folder" ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="flex items-center gap-2 py-1.5">
                      <span className="text-base">{getFileIcon(item)}</span>
                      <span className="text-[hsl(var(--surface-foreground))]">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-1.5 text-[hsl(var(--muted-foreground))]">
                      {item.size ? formatSize(item.size) : "--"}
                    </td>
                    <td className="py-1.5 text-[hsl(var(--muted-foreground))]">
                      {item.modified ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
}
