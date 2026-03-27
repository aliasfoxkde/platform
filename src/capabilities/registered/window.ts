/**
 * Window capability — window management operations.
 */

import { registerCapability } from '../registry';
import { useWindowStore } from '../../shell/stores/windowStore';

registerCapability(
  {
    id: 'window',
    name: 'Window Manager',
    version: '1.0.0',
    description: 'Open, close, focus, and manage application windows',
    category: 'system',
    permissions: [
      { scope: 'window', description: 'Open, close, and manage windows' },
    ],
    commands: [
      { id: 'open', label: 'Open Window', description: 'Open a window for an app', params: { appId: { type: 'string', description: 'App ID to open', required: true } }, permission: 'window' },
      { id: 'close', label: 'Close Window', description: 'Close a window by ID', params: { windowId: { type: 'string', description: 'Window ID to close', required: true } }, permission: 'window' },
      { id: 'focus', label: 'Focus Window', description: 'Bring a window to front', params: { windowId: { type: 'string', description: 'Window ID to focus', required: true } }, permission: 'window' },
      { id: 'minimize', label: 'Minimize Window', description: 'Minimize a window', params: { windowId: { type: 'string', description: 'Window ID', required: true } }, permission: 'window' },
      { id: 'maximize', label: 'Maximize Window', description: 'Toggle maximize on a window', params: { windowId: { type: 'string', description: 'Window ID', required: true } }, permission: 'window' },
    ],
  },
  {
    open: ({ appId }) => useWindowStore.getState().openWindow(appId as string),
    close: ({ windowId }) => { useWindowStore.getState().closeWindow(windowId as string); return true; },
    focus: ({ windowId }) => { useWindowStore.getState().focusWindow(windowId as string); return true; },
    minimize: ({ windowId }) => { useWindowStore.getState().minimizeWindow(windowId as string); return true; },
    maximize: ({ windowId }) => { useWindowStore.getState().toggleMaximize(windowId as string); return true; },
  },
);
