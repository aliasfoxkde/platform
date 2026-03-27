import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useWindowStore } from '../stores/windowStore';
import clsx from 'clsx';

interface WindowProps {
  windowId: string;
  children?: React.ReactNode;
}

export function Window({ windowId, children }: WindowProps) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === windowId));
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);

  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    winStartX: number;
    winStartY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
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
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win, focusWindow, windowId],
  );

  // Resizing (bottom-right handle)
  const handleResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (win?.isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(windowId);

      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: win!.width,
        startH: win!.height,
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
        moveWindow(
          windowId,
          dragRef.current.winStartX + dx,
          dragRef.current.winStartY + dy,
        );
      }
      if (isResizing && resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        resizeWindow(
          windowId,
          resizeRef.current.startW + dx,
          resizeRef.current.startH + dy,
        );
      }
    };

    const handleUp = () => {
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
  }, [isDragging, isResizing, windowId, moveWindow, resizeWindow]);

  if (!win) return null;
  if (win.isMinimized) return null;

  const isActive = useWindowStore((s) => s.activeWindowId === windowId);

  return (
    <div
      ref={windowRef}
      data-window={windowId}
      className={clsx(
        'absolute flex flex-col overflow-hidden',
        'rounded-[var(--radius-window)]',
        'shadow-2xl shadow-[hsl(var(--window-shadow))]',
        'transition-[border-color] duration-150',
        isActive
          ? 'glass-heavy border-[hsl(var(--border-bright))]'
          : 'glass border-[hsl(var(--border)/0.3)]',
        win.isMaximized && '!rounded-none !transition-none',
        isDragging && 'select-none',
      )}
      style={{
        left: win.isMaximized ? 0 : win.x,
        top: win.isMaximized ? 0 : win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        transition: win.isMaximized
          ? 'none'
          : isDragging
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

      {/* Resize Handle */}
      {!win.isMaximized && (
        <div
          data-resize-handle
          className={clsx(
            'absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize',
            'hover:bg-[hsl(var(--accent)/0.2)]',
            'transition-colors duration-100',
          )}
          onPointerDown={handleResizeStart}
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
      )}
    </div>
  );
}
