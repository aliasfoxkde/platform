/**
 * GlobalHotkeys — system-wide keyboard shortcuts.
 *
 * Wired at the Desktop level to provide:
 * - Ctrl+Tab / Ctrl+Shift+Tab — cycle windows
 * - Ctrl+W — close active window
 * - F11 — toggle maximize for active window
 */

import { useHotkey } from '../hooks/useHotkey';
import { useWindowStore } from '../stores/windowStore';

export function GlobalHotkeys() {
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const focusWindow = useWindowStore((s) => s.focusWindow);

  // Ctrl+Tab — cycle to next window
  useHotkey('ctrl+tab', () => {
    const { windows } = useWindowStore.getState();
    const visible = windows.filter((w) => !w.isMinimized);
    if (visible.length < 2) return;
    const { activeWindowId } = useWindowStore.getState();
    const idx = visible.findIndex((w) => w.id === activeWindowId);
    const next = visible[(idx + 1) % visible.length];
    focusWindow(next.id);
  });

  // Ctrl+Shift+Tab — cycle to previous window
  useHotkey('ctrl+shift+tab', () => {
    const { windows } = useWindowStore.getState();
    const visible = windows.filter((w) => !w.isMinimized);
    if (visible.length < 2) return;
    const { activeWindowId } = useWindowStore.getState();
    const idx = visible.findIndex((w) => w.id === activeWindowId);
    const prev = visible[(idx - 1 + visible.length) % visible.length];
    focusWindow(prev.id);
  });

  // Ctrl+W — close active window
  useHotkey('ctrl+w', () => {
    const { activeWindowId } = useWindowStore.getState();
    if (activeWindowId) closeWindow(activeWindowId);
  });

  // F11 — toggle maximize
  useHotkey('f11', () => {
    const { activeWindowId } = useWindowStore.getState();
    if (activeWindowId) toggleMaximize(activeWindowId);
  });

  return null;
}
