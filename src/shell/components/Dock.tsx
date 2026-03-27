import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useWindowStore } from '../stores/windowStore';
import { useThemeStore } from '../stores/themeStore';
import clsx from 'clsx';

const DOCK_ICON_SIZE = 48;
const DOCK_MAGNIFICATION = 0.35; // max 35% scale increase
const DOCK_MAGNIFICATION_RANGE = 200; // px range for magnification

export function Dock() {
  const apps = useAppStore((s) => s.apps);
  const pinnedApps = useAppStore((s) => s.pinnedApps);
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const dockRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [time, setTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Get running app IDs
  const runningAppIds = useMemo(
    () => new Set(windows.map((w) => w.appId)),
    [windows],
  );

  // Filter pinned apps that exist
  const dockApps = useMemo(
    () => pinnedApps.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as typeof apps,
    [pinnedApps, apps],
  );

  // Calculate magnification for each icon
  const getIconScale = useCallback(
    (index: number) => {
      if (mouseX === null || !dockRef.current) return 1;
      const icons = dockRef.current.querySelectorAll<HTMLElement>('[data-dock-icon]');
      const iconEl = icons[index];
      if (!iconEl) return 1;

      const iconRect = iconEl.getBoundingClientRect();
      const iconCenterX = iconRect.left + iconRect.width / 2;
      const distance = Math.abs(mouseX - iconCenterX);

      if (distance > DOCK_MAGNIFICATION_RANGE) return 1;

      const scale = 1 + DOCK_MAGNIFICATION * (1 - distance / DOCK_MAGNIFICATION_RANGE);
      return scale;
    },
    [mouseX],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  const handleAppClick = useCallback(
    (appId: string) => {
      const win = windows.find((w) => w.appId === appId);
      if (!win) {
        openWindow(appId);
        return;
      }
      if (win.isMinimized) {
        restoreWindow(win.id);
      } else if (useWindowStore.getState().activeWindowId === win.id) {
        toggleMinimize(win.id);
      } else {
        focusWindow(win.id);
      }
    },
    [windows, openWindow, restoreWindow, focusWindow, toggleMinimize],
  );

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: Date) =>
    d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9000] flex items-end gap-2">
      {/* Main Dock */}
      <nav
        ref={dockRef}
        data-dock
        className={clsx(
          'flex items-end gap-1.5 px-2.5 py-1.5',
          'rounded-[1.25rem]',
          'glass-heavy',
          'transition-[padding] duration-200',
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="toolbar"
        aria-label="Application dock"
      >
        {dockApps.map((app, index) => {
          const isRunning = runningAppIds.has(app.id);
          const scale = getIconScale(index);
          const isEmoji = app.icon.length <= 4;

          return (
            <button
              key={app.id}
              data-dock-icon
              className={clsx(
                'relative flex flex-col items-center justify-center',
                'rounded-[var(--radius-lg)]',
                'transition-transform duration-150 ease-out',
                'hover:brightness-110',
                'focus-visible:outline-2 focus-visible:outline-[hsl(var(--accent))]',
              )}
              style={{
                width: DOCK_ICON_SIZE * scale,
                height: DOCK_ICON_SIZE * scale,
                transform: `scale(${scale})`,
                transformOrigin: 'bottom center',
              }}
              onClick={() => handleAppClick(app.id)}
              aria-label={app.title}
              title={app.title}
            >
              <div className="w-full h-full flex items-center justify-center">
                {isEmoji ? (
                  <span className="text-[1.75rem] leading-none">{app.icon}</span>
                ) : (
                  <img
                    src={app.icon}
                    alt={app.title}
                    className="w-10 h-10 object-contain"
                    draggable={false}
                  />
                )}
              </div>
              {/* Running indicator dot */}
              {isRunning && (
                <span
                  className={clsx(
                    'absolute -bottom-1 w-1 h-1 rounded-full',
                    'bg-[hsl(var(--foreground)/0.7)]',
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* System Tray */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2',
          'rounded-[var(--radius-lg)]',
          'glass-heavy',
          'text-xs text-[hsl(var(--muted-foreground))]',
        )}
      >
        {/* Theme Toggle */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[hsl(var(--accent)/0.1)] transition-colors duration-150 cursor-default"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-[hsl(var(--border))]" />

        {/* Clock */}
        <div className="flex flex-col items-end leading-tight whitespace-nowrap">
          <span className="text-[hsl(var(--foreground))] font-medium">
            {formatTime(time)}
          </span>
          <span className="text-[0.65rem]">{formatDate(time)}</span>
        </div>
      </div>
    </div>
  );
}
