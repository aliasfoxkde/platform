/**
 * Panel — sidebar panel with header, actions, and scrollable content.
 */

import { type ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
  width?: string;
}

export function Panel({ title, children, actions, onClose, className = '', width = 'w-72' }: PanelProps) {
  return (
    <div
      className={`absolute top-0 right-0 bottom-0 ${width} bg-[hsl(var(--surface))] border-l border-[hsl(var(--border))] z-20 flex flex-col shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] shrink-0">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              onClick={onClose}
              className="text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] text-lg cursor-pointer"
              aria-label="Close panel"
            >
              x
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}
