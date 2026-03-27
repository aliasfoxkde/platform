/**
 * Toolbar — horizontal toolbar container for app toolbars.
 */

import { type ReactNode } from 'react';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 bg-[hsl(var(--surface-secondary))] border-b border-[hsl(var(--border))] shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
