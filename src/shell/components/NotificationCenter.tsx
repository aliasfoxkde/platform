import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { useClickOutside } from '../hooks/useClickOutside';
import clsx from 'clsx';
import type { NotificationType } from '../types';

const TYPE_DOT_COLORS: Record<NotificationType, string> = {
  info: 'bg-[hsl(var(--accent))]',
  success: 'bg-[hsl(142_71%_45%)]',
  warning: 'bg-[hsl(48_96%_53%)]',
  error: 'bg-[hsl(0_84%_60%)]',
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside(panelRef, isOpen ? onClose : undefined);

  // Trap focus inside panel when open
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0]?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    [notifications],
  );

  const handleDismiss = useCallback(
    (id: string) => dismissNotification(id),
    [dismissNotification],
  );

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      data-notification-center
      className={clsx(
        'fixed bottom-14 right-4 z-[9600] w-80 max-h-96',
        'glass-heavy rounded-xl border border-[hsl(var(--border))]',
        'shadow-xl shadow-black/30',
        'flex flex-col overflow-hidden',
        'animate-[slideInUp_150ms_ease-out]',
      )}
      role="dialog"
      aria-label="Notification center"
      aria-modal="false"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          Notifications
        </h3>
        {sorted.length > 0 && (
          <button
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            onClick={clearAll}
            aria-label="Clear all notifications"
          >
            Clear all
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
            <svg className="w-8 h-8 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-xs">No notifications</p>
          </div>
        ) : (
          sorted.map((notif) => (
            <div
              key={notif.id}
              className={clsx(
                'flex items-start gap-3 px-4 py-3',
                'border-b border-[hsl(var(--border)/0.5)] last:border-b-0',
                'hover:bg-[hsl(var(--accent)/0.05)] transition-colors duration-100',
              )}
            >
              <span
                className={clsx(
                  'w-2 h-2 rounded-full shrink-0 mt-1.5',
                  TYPE_DOT_COLORS[notif.type],
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[hsl(var(--foreground))] leading-tight truncate">
                  {notif.title}
                </p>
                {notif.message && (
                  <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                    {notif.message}
                  </p>
                )}
                <span className="text-[0.65rem] text-[hsl(var(--muted-foreground)/0.6)] mt-0.5 block">
                  {formatTime(notif.createdAt)}
                </span>
              </div>
              <button
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface)/0.5)] transition-colors"
                onClick={() => handleDismiss(notif.id)}
                aria-label={`Dismiss ${notif.title}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
