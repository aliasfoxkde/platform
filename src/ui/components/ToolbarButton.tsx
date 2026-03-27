/**
 * ToolbarButton — compact icon button used in app toolbars.
 */

import { type ReactNode } from 'react';

interface ToolbarButtonProps {
  children: ReactNode;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

export function ToolbarButton({
  children,
  title,
  onClick,
  disabled = false,
  active = false,
  className = '',
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={title}
      className={`p-1.5 rounded text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--surface-secondary))] transition-colors cursor-pointer ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${active ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
