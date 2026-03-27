import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useWindowStore } from '../stores/windowStore';
import clsx from 'clsx';
import type { DesktopIconState } from '../types';

interface DesktopIconProps {
  icon: DesktopIconState;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DesktopIcon({
  icon,
  isSelected,
  onSelect,
  onPositionChange,
  containerRef,
}: DesktopIconProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    iconStartX: number;
    iconStartY: number;
    isDragging: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(icon.id);

      const container = containerRef.current;
      if (!container) return;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        iconStartX: icon.x,
        iconStartY: icon.y,
        isDragging: false,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;

        // Threshold to distinguish click from drag
        if (!dragRef.current.isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          dragRef.current.isDragging = true;
          (e.target as HTMLElement).setPointerCapture(moveEvent.pointerId);
        }

        if (dragRef.current.isDragging) {
          const containerRect = container.getBoundingClientRect();
          const newX = Math.max(
            0,
            Math.min(
              containerRect.width - 80,
              dragRef.current.iconStartX + dx,
            ),
          );
          const newY = Math.max(
            0,
            Math.min(
              containerRect.height - 90,
              dragRef.current.iconStartY + dy,
            ),
          );
          onPositionChange(icon.id, newX, newY);
        }
      };

      const onPointerUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [icon.id, icon.x, icon.y, onSelect, onPositionChange, containerRef],
  );

  const handleDoubleClick = useCallback(() => {
    openWindow(icon.appId);
  }, [openWindow, icon.appId]);

  const isEmoji = icon.icon.length <= 4;

  return (
    <div
      data-desktop-icon
      className={clsx(
        'group flex flex-col items-center justify-center gap-1 w-20 h-[5.5rem] rounded-lg',
        'cursor-default select-none transition-colors duration-100',
        'touch-none',
        isSelected
          ? 'bg-[hsl(var(--accent)/0.15)] ring-1 ring-[hsl(var(--accent)/0.4)]'
          : 'hover:bg-[hsl(var(--surface)/0.6)]',
      )}
      style={{
        position: 'absolute',
        left: icon.x,
        top: icon.y,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={clsx(
          'flex items-center justify-center w-12 h-12 rounded-lg',
          'text-2xl transition-transform duration-150',
          'group-hover:scale-105',
        )}
      >
        {isEmoji ? (
          <span role="img" aria-label={icon.label}>
            {icon.icon}
          </span>
        ) : (
          <img
            src={icon.icon}
            alt={icon.label}
            className="w-10 h-10 object-contain"
            draggable={false}
          />
        )}
      </div>
      <span
        className={clsx(
          'text-xs leading-tight text-center max-w-[4.5rem] truncate',
          'px-1 rounded px-1.5 py-0.5',
          'text-[hsl(var(--foreground))]',
          isSelected
            ? 'bg-[hsl(var(--accent)/0.3)]'
            : 'bg-[hsl(var(--background)/0.4)]',
        )}
      >
        {icon.label}
      </span>
    </div>
  );
}
