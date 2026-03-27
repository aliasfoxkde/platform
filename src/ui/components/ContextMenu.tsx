/**
 * ContextMenu — right-click context menu.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Position adjustment to keep menu in viewport
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const adjusted = { x, y };
    if (rect.right > window.innerWidth) adjusted.x = x - rect.width;
    if (rect.bottom > window.innerHeight) adjusted.y = y - rect.height;
    if (adjusted.x < 0) adjusted.x = 0;
    if (adjusted.y < 0) adjusted.y = 0;
    setPos(adjusted);
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use timeout to avoid immediate closing from the right-click that opened this
    const timer = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 animate-scale-in"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 border-t border-[hsl(var(--border))]" />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors cursor-pointer ${
              item.disabled
                ? 'opacity-40 cursor-not-allowed'
                : item.danger
                  ? 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10'
                  : 'text-[hsl(var(--text))] hover:bg-[hsl(var(--surface-secondary))]'
            }`}
          >
            {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

/** Hook for context menu state. */
export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const close = () => setMenu(null);

  return { menu, open, close };
}
