/**
 * Notification capability — toast notifications via notification store.
 */

import { registerCapability } from '../registry';
import { useNotificationStore } from '../../shell/stores/notificationStore';

registerCapability(
  {
    id: 'notification',
    name: 'Notifications',
    version: '1.0.0',
    description: 'Toast notification system',
    category: 'system',
    permissions: [
      { scope: 'notification', description: 'Send and manage notifications' },
    ],
    commands: [
      { id: 'send', label: 'Send Notification', description: 'Show a notification toast', params: { title: { type: 'string', description: 'Notification title', required: true }, message: { type: 'string', description: 'Notification message' }, type: { type: 'string', description: 'Type: info, success, warning, error', enum: ['info', 'success', 'warning', 'error'] } }, permission: 'notification' },
      { id: 'dismiss', label: 'Dismiss Notification', description: 'Dismiss a notification by ID', params: { id: { type: 'string', description: 'Notification ID', required: true } }, permission: 'notification' },
      { id: 'clearAll', label: 'Clear All Notifications', description: 'Dismiss all active notifications', permission: 'notification' },
    ],
  },
  {
    send: ({ title, message, type }) => {
      const id = useNotificationStore.getState().addNotification({
        title: title as string,
        message: message as string | undefined,
        type: (type as 'info' | 'success' | 'warning' | 'error') | undefined,
      });
      return id;
    },
    dismiss: ({ id }) => {
      useNotificationStore.getState().dismissNotification(id as string);
      return true;
    },
    clearAll: () => {
      useNotificationStore.getState().clearAll();
      return true;
    },
  },
);
