/**
 * EmptyState — centered empty state with icon, title, description, and action.
 */

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 text-[hsl(var(--text-secondary))] select-none ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-secondary))] flex items-center justify-center text-[hsl(var(--text-secondary))]">
          {icon}
        </div>
      )}
      <div className="text-center">
        <p className="text-base font-medium text-[hsl(var(--text))]">{title}</p>
        {description && <p className="text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
