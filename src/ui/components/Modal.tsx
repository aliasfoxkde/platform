/**
 * Modal — dialog overlay with title, content, and action buttons.
 */

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, actions, className = '' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-md mx-4 animate-scale-in ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] p-1 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[hsl(var(--border))]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
