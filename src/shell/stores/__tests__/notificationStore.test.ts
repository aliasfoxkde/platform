import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a notification', () => {
    const id = useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test',
    });
    expect(id).toBeTruthy();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('auto-dismisses info notifications after default duration', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test',
    });
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('does not auto-dismiss notifications without duration', () => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Persistent',
      duration: 0,
    });
    vi.advanceTimersByTime(10000);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('dismissNotification removes specific notification', () => {
    const id = useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Test',
    });
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: 'Other',
    });
    useNotificationStore.getState().dismissNotification(id);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().notifications[0].title).toBe('Other');
  });

  it('clearAll removes all notifications', () => {
    useNotificationStore.getState().addNotification({ type: 'info', title: '1' });
    useNotificationStore.getState().addNotification({ type: 'info', title: '2' });
    useNotificationStore.getState().addNotification({ type: 'info', title: '3' });
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
