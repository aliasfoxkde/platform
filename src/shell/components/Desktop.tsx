import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useThemeStore } from '../stores/themeStore';
import { useWindowStore } from '../stores/windowStore';
import { useAppStore } from '../stores/appStore';
import { DesktopIcon } from './DesktopIcon';
import { GlobalHotkeys } from './GlobalHotkeys';
import type { DesktopIconState } from '../types';

const GRID_SIZE = 90;
const ICON_PADDING = 16;

interface ContextMenuState {
  x: number;
  y: number;
  isOpen: boolean;
}

export function Desktop() {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const windows = useWindowStore((s) => s.windows);
  const apps = useAppStore((s) => s.apps);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  // Generate initial desktop icon positions from pinned apps
  const desktopIcons = useMemo<DesktopIconState[]>(() => {
    return apps
      .filter((app) => ['terminal', 'editor', 'filemanager', 'calculator', 'browser', 'notes', 'settings'].includes(app.id))
      .map((app, index) => ({
        id: `desktop-icon-${app.id}`,
        appId: app.id,
        label: app.title,
        icon: app.icon,
        x: ICON_PADDING,
        y: ICON_PADDING + index * GRID_SIZE,
      }));
  }, [apps]);

  // Close context menu on click anywhere
  const handleDesktopClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    setSelectedIconId(null);
  }, []);

  // Right-click context menu
  const handleContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isOpen: true,
      });
    },
    [],
  );

  // Close context menu on scroll or outside click
  useEffect(() => {
    if (!contextMenu.isOpen) return;
    const handler = () => setContextMenu((prev) => ({ ...prev, isOpen: false }));
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [contextMenu.isOpen]);

  const handleIconSelect = useCallback((id: string) => {
    setSelectedIconId(id);
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleIconPositionChange = useCallback(
    (_id: string, _x: number, _y: number) => {
      // Position is managed via state update - for now this is a no-op
      // since icons are positioned absolutely from the desktopIcons array.
      // In a full implementation, we would update icon positions in a store.
    },
    [],
  );

  const wallpaperStyle = useMemo(() => {
    if (wallpaper.type === 'gradient') {
      return { background: wallpaper.value };
    }
    if (wallpaper.type === 'solid') {
      return { backgroundColor: wallpaper.value };
    }
    return {
      backgroundImage: `url(${wallpaper.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }, [wallpaper]);

  return (
    <>
    <GlobalHotkeys />
    <div
      ref={containerRef}
      data-desktop
      className="absolute inset-0 overflow-hidden"
      style={wallpaperStyle}
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
    >
      {/* Desktop Icons */}
      {desktopIcons.map((icon) => (
        <DesktopIcon
          key={icon.id}
          icon={icon}
          isSelected={selectedIconId === icon.id}
          onSelect={handleIconSelect}
          onPositionChange={handleIconPositionChange}
          containerRef={containerRef}
        />
      ))}

      {/* Windows layer */}
      {windows.map((win) => {
        if (win.isMinimized) return null;
        return (
          <div
            key={win.id}
            data-window-slot
            className="absolute inset-0 pointer-events-none"
          >
            <div className="pointer-events-auto" data-window-slot-inner={win.id} />
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          data-context-menu
          className="glass-heavy fixed z-[9999] min-w-[180px] rounded-lg py-1 shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            label="New Terminal"
            icon="⌨️"
            onClick={() => {
              useWindowStore.getState().openWindow('terminal');
              setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }}
          />
          <ContextMenuItem
            label="New File Manager"
            icon="📁"
            onClick={() => {
              useWindowStore.getState().openWindow('filemanager');
              setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }}
          />
          <div className="my-1 h-px bg-[hsl(var(--border))]" />
          <ContextMenuItem
            label="Change Wallpaper"
            icon="🖼️"
            onClick={() => {
              useWindowStore.getState().openWindow('settings');
              setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }}
          />
          <ContextMenuItem
            label="Settings"
            icon="⚙️"
            onClick={() => {
              useWindowStore.getState().openWindow('settings');
              setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }}
          />
        </div>
      )}
    </div>
    </>
  );
}

function ContextMenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)] transition-colors duration-100 cursor-default"
      onClick={onClick}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
