import { useCallback, useMemo } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import clsx from 'clsx';
import type { NotificationType } from '../types';

const TYPE_STYLES: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  info: {
    bg: 'bg-[hsl(var(--accent)/0.1)]',
    border: 'border-[hsl(var(--accent)/0.3)]',
    icon: 'i',
  },
  success: {
    bg: 'bg-[hsl(142_71%_45%/0.1)]',
    border: 'border-[hsl(142_71%_45%/0.3)]',
    icon: '✓',
  },
  warning: {
    bg: 'bg-[hsl(48_96%_53%/0.1)]',
    border: 'border-[hsl(48_96%_53%/0.3)]',
    icon: '!',
  },
  error: {
    bg: 'bg-[hsl(0_63%_31%/0.15)]',
    border: 'border-[hsl(0_63%_31%/0.4)]',
    icon: '✕',
  },
};

const TYPE_ICON_STYLES: Record<NotificationType, string> = {
  info: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
  success: 'bg-[hsl(142_71%_45%)] text-white',
  warning: 'bg-[hsl(48_96%_53%)] text-black',
  error: 'bg-[hsl(0_84%_60%)] text-white',
};

export function NotificationToast() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);

  // Sort by creation time, newest first (for stacking)
  const sorted = useMemo(
    () => [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    [notifications],
  );

  return (
    <div
      data-notification-container
      className="fixed bottom-20 right-4 z-[9500] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {sorted.map((notif) => (
        <NotificationItem
          key={notif.id}
          id={notif.id}
          type={notif.type}
          title={notif.title}
          message={notif.message}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  id,
  type,
  title,
  message,
  onDismiss,
}: {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  onDismiss: (id: string) => void;
}) {
  const style = TYPE_STYLES[type];
  const iconStyle = TYPE_ICON_STYLES[type];

  const handleDismiss = useCallback(() => {
    onDismiss(id);
  }, [onDismiss, id]);

  return (
    <div
      data-notification={id}
      className={clsx(
        'pointer-events-auto',
        'flex items-start gap-3 w-80 max-w-[90vw]',
        'glass-heavy rounded-lg p-3',
        'border',
        style.bg,
        style.border,
        'animate-[slideInRight_200ms_ease-out]',
        'shadow-lg shadow-black/20',
      )}
      role="alert"
    >
      {/* Icon */}
      <div
        className={clsx(
          'flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5',
          'text-xs font-bold',
          iconStyle,
        )}
      >
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[hsl(var(--foreground))] leading-tight">
          {title}
        </p>
        {message && (
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        className={clsx(
          'flex items-center justify-center w-5 h-5 rounded-full shrink-0',
          'text-[hsl(var(--muted-foreground))]',
          'hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface)/0.5)]',
          'transition-colors duration-100',
        )}
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </button>
    </div>
  );
}
