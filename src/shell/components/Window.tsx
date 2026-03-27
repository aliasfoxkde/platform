import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useWindowStore, detectSnapZone, getSnapBounds } from '../stores/windowStore';
import type { SnapZone } from '../types';
import clsx from 'clsx';

interface WindowProps {
  windowId: string;
  children?: React.ReactNode;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_SIZE = 6; // px hit area for resize edges

const EDGE_CURSORS: Record<ResizeEdge, string> = {
  n: 'cursor-n-resize',
  s: 'cursor-s-resize',
  e: 'cursor-e-resize',
  w: 'cursor-w-resize',
  ne: 'cursor-ne-resize',
  nw: 'cursor-nw-resize',
  se: 'cursor-se-resize',
  sw: 'cursor-sw-resize',
};

export function Window({ windowId, children }: WindowProps) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === windowId));
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const moveWindowFull = useWindowStore((s) => s.moveWindowFull);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const snapWindow = useWindowStore((s) => s.snapWindow);
  const unsnapWindow = useWindowStore((s) => s.unsnapWindow);

  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    winStartX: number;
    winStartY: number;
    winStartW: number;
    winStartH: number;
    isSnapped: boolean;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startW: number;
    startH: number;
    edge: ResizeEdge;
  } | null>(null);

  // Focus on pointer down
  const handlePointerDown = useCallback(() => {
    focusWindow(windowId);
  }, [focusWindow, windowId]);

  // Double-click titlebar to maximize
  const handleTitleDoubleClick = useCallback(() => {
    toggleMaximize(windowId);
  }, [toggleMaximize, windowId]);

  // Dragging (titlebar)
  const handleDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (win?.isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(windowId);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        winStartX: win!.x,
        winStartY: win!.y,
        winStartW: win!.width,
        winStartH: win!.height,
        isSnapped: win!.snapZone !== undefined && win!.snapZone !== 'none',
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win, focusWindow, windowId],
  );

  // Multi-edge resize start
  const handleResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
      if (win?.isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(windowId);

      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: win!.x,
        startTop: win!.y,
        startW: win!.width,
        startH: win!.height,
        edge,
      };
      setIsResizing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win, focusWindow, windowId],
  );

  // Pointer move handler for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: PointerEvent) => {
      if (isDragging && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        // If window was snapped, unsnap it on first significant drag
        if (dragRef.current.isSnapped && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          unsnapWindow(windowId);
          // Reset drag origin to the current (restored) position
          const current = useWindowStore.getState().windows.find((w) => w.id === windowId);
          if (current) {
            dragRef.current.winStartX = current.x;
            dragRef.current.winStartY = current.y;
            dragRef.current.winStartW = current.width;
            dragRef.current.winStartH = current.height;
            dragRef.current.startX = e.clientX;
            dragRef.current.startY = e.clientY;
            dragRef.current.isSnapped = false;
          }
          return;
        }

        const newX = dragRef.current.winStartX + dx;
        const newY = dragRef.current.winStartY + dy;
        const w = dragRef.current.winStartW;
        const h = dragRef.current.winStartH;

        moveWindow(windowId, newX, newY);

        // Detect snap zone and show preview
        const zone = detectSnapZone(newX, newY, w, h);
        setSnapPreview(zone !== 'none' ? zone : null);
      }

      if (isResizing && resizeRef.current) {
        const { startX, startY, startLeft, startTop, startW, startH, edge } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = startLeft;
        let newY = startTop;
        let newW = startW;
        let newH = startH;

        // Horizontal edges
        if (edge.includes('e')) newW = startW + dx;
        if (edge.includes('w')) {
          newX = startLeft + dx;
          newW = startW - dx;
        }

        // Vertical edges
        if (edge.includes('s')) newH = startH + dy;
        if (edge.includes('n')) {
          newY = startTop + dy;
          newH = startH - dy;
        }

        moveWindowFull(windowId, newX, newY, newW, newH);
      }
    };

    const handleUp = () => {
      if (isDragging && snapPreview) {
        snapWindow(windowId, snapPreview);
        setSnapPreview(null);
      }
      dragRef.current = null;
      resizeRef.current = null;
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, isResizing, windowId, moveWindow, moveWindowFull, resizeWindow, snapPreview, snapWindow, unsnapWindow]);

  if (!win) return null;
  if (win.isMinimized) return null;

  const isActive = useWindowStore((s) => s.activeWindowId === windowId);

  // Snap preview overlay
  const snapBounds = snapPreview ? getSnapBounds(snapPreview) : null;

  return (
    <>
      {/* Snap zone preview */}
      {snapBounds && (
        <div
          className="fixed z-[9998] border-2 border-dashed border-[hsl(var(--accent)/0.5)] rounded-lg pointer-events-none"
          style={{
            left: snapBounds.x + 4,
            top: snapBounds.y + 4,
            width: snapBounds.width - 8,
            height: snapBounds.height - 8,
          }}
        />
      )}

      <div
        ref={windowRef}
        data-window={windowId}
        role="dialog"
        aria-label={win.title}
        className={clsx(
          'absolute flex flex-col overflow-hidden',
          'rounded-[var(--radius-window)]',
          'shadow-2xl shadow-[hsl(var(--window-shadow))]',
          'transition-[border-color] duration-150',
          isActive
            ? 'glass-heavy border-[hsl(var(--border-bright))]'
            : 'glass border-[hsl(var(--border)/0.3)]',
          win.isMaximized && '!rounded-none !transition-none',
          win.snapZone && win.snapZone !== 'none' && win.snapZone !== 'maximized' && '!transition-none',
          isDragging && 'select-none',
          isResizing && 'select-none',
        )}
        style={{
          left: win.isMaximized ? 0 : win.x,
          top: win.isMaximized ? 0 : win.y,
          width: win.width,
          height: win.height,
          zIndex: win.zIndex,
          transition: win.isMaximized || (win.snapZone && win.snapZone !== 'none')
            ? 'none'
            : isDragging || isResizing
              ? 'none'
              : 'left 150ms cubic-bezier(0.4,0,0.2,1), top 150ms cubic-bezier(0.4,0,0.2,1), width 200ms cubic-bezier(0.4,0,0.2,1), height 200ms cubic-bezier(0.4,0,0.2,1)',
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Title Bar */}
        <div
          className={clsx(
            'flex items-center h-10 shrink-0 px-3 gap-2',
            'border-b border-[hsl(var(--border)/0.4)]',
            'select-none touch-none',
            isActive
              ? 'bg-[hsl(var(--window-titlebar))]'
              : 'bg-[hsl(var(--surface)/0.5)]',
          )}
          onPointerDown={handleDragStart}
          onDoubleClick={handleTitleDoubleClick}
          role="toolbar"
          aria-label="Window controls"
        >
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5 -ml-0.5 mr-1 shrink-0">
            <button
              className={clsx(
                'w-3 h-3 rounded-full transition-colors duration-100',
                'flex items-center justify-center',
                'hover:brightness-110',
              )}
              style={{ backgroundColor: '#ff5f57' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(windowId);
              }}
              aria-label="Close window"
            >
              <svg
                className="w-[6px] h-[6px] opacity-0 hover:opacity-100 transition-opacity"
                viewBox="0 0 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                color="rgba(0,0,0,0.6)"
              >
                <line x1="0" y1="0" x2="6" y2="6" />
                <line x1="6" y1="0" x2="0" y2="6" />
              </svg>
            </button>
            <button
              className={clsx(
                'w-3 h-3 rounded-full transition-colors duration-100',
                'flex items-center justify-center',
                'hover:brightness-110',
              )}
              style={{ backgroundColor: '#febc2e' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize(windowId);
              }}
              aria-label="Minimize window"
            >
              <svg
                className="w-[6px] h-[6px] opacity-0 hover:opacity-100 transition-opacity"
                viewBox="0 0 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                color="rgba(0,0,0,0.6)"
              >
                <line x1="0" y1="3" x2="6" y2="3" />
              </svg>
            </button>
            <button
              className={clsx(
                'w-3 h-3 rounded-full transition-colors duration-100',
                'flex items-center justify-center',
                'hover:brightness-110',
              )}
              style={{ backgroundColor: '#28c840' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize(windowId);
              }}
              aria-label="Maximize window"
            >
              <svg
                className="w-[6px] h-[6px] opacity-0 hover:opacity-100 transition-opacity"
                viewBox="0 0 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                color="rgba(0,0,0,0.6)"
              >
                <polyline points="0,0 0,6 6,6 6,0" />
              </svg>
            </button>
          </div>

          {/* Icon and Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm shrink-0">{win.icon}</span>
            <span
              className={clsx(
                'text-xs font-medium truncate',
                'text-[hsl(var(--surface-foreground))]',
                isActive
                  ? 'opacity-100'
                  : 'opacity-60',
              )}
            >
              {win.title}
            </span>
          </div>

          {/* Spacer for traffic lights visual balance */}
          <div className="w-[52px] shrink-0" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-[hsl(var(--window-bg))]">
          {children ?? (
            <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))] text-sm">
              {win.title} content area
            </div>
          )}
        </div>

        {/* Multi-edge resize handles */}
        {!win.isMaximized && (
          <>
            {/* Invisible edge hit areas */}
            <div
              className="absolute top-0 left-0 right-0 h-[6px] cursor-n-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'n')}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-[6px] cursor-s-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 's')}
            />
            <div
              className="absolute left-0 top-0 bottom-0 w-[6px] cursor-w-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'w')}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-[6px] cursor-e-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'e')}
            />
            <div
              className="absolute top-0 left-0 w-[10px] h-[10px] cursor-nw-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              className="absolute top-0 right-0 w-[10px] h-[10px] cursor-ne-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-[10px] h-[10px] cursor-sw-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-[10px] h-[10px] cursor-se-resize z-10"
              onPointerDown={(e) => handleResizeStart(e, 'se')}
            />

            {/* Visible corner resize indicator (bottom-right only) */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
              style={{ pointerEvents: 'none' }}
            >
              <svg
                className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 opacity-30"
                viewBox="0 0 10 10"
                fill="hsl(var(--muted-foreground))"
              >
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
                <circle cx="9" cy="9" r="1" />
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="1" r="1" />
              </svg>
            </div>
          </>
        )}
      </div>
    </>
  );
}
