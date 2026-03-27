import { create } from 'zustand';
import type { Notification, NotificationType } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let notificationCounter = 0;

function generateId(): string {
  return `notif-${++notificationCounter}`;
}

/** Default auto-dismiss durations per notification type (ms). */
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  info: 5000,
  success: 4000,
  warning: 7000,
  error: 10000,
};

// Track active timers so they can be cancelled on manual dismiss.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleDismiss(id: string, duration: number): void {
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);

  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      useNotificationStore.getState().dismissNotification(id);
    }, duration),
  );
}

function cancelDismiss(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface NotificationState {
  notifications: Notification[];
  addNotification: (opts: {
    type?: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    actions?: Notification['actions'];
  }) => string;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: ({ type = 'info', title, message, duration, actions }) => {
    const id = generateId();
    const autoDismiss = duration ?? DEFAULT_DURATIONS[type];

    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: autoDismiss > 0 ? autoDismiss : undefined,
      createdAt: Date.now(),
      actions,
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    if (autoDismiss > 0) {
      scheduleDismiss(id, autoDismiss);
    }

    return id;
  },

  dismissNotification: (id: string) => {
    cancelDismiss(id);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    for (const id of timers.keys()) {
      cancelDismiss(id);
    }
    set({ notifications: [] });
  },
}));
