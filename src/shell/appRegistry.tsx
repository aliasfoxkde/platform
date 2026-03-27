import { lazy, type ComponentType } from 'react';

/** Map app IDs to their React components. */
const appComponents: Record<string, ComponentType> = {
  terminal: lazy(() => import('@/apps/terminal/TerminalApp')),
  editor: lazy(() => import('@/apps/editor/EditorApp')),
  filemanager: lazy(() => import('@/apps/filemanager/FileManagerApp')),
  settings: lazy(() => import('@/apps/settings/SettingsApp')),
  calculator: lazy(() => import('@/apps/calculator/CalculatorApp')),
  about: lazy(() => import('@/apps/about/AboutApp')),
  monitor: lazy(() => import('@/apps/monitor/MonitorApp')),
  notes: lazy(() => import('@/apps/notes/NotesApp')),
  tasks: lazy(() => import('@/apps/tasks/TaskManagerApp')),
  pdfviewer: lazy(() => import('@/apps/pdfviewer/PDFViewerApp')),
  calendar: lazy(() => import('@/apps/calendar/CalendarApp')),
  clipboard: lazy(() => import('@/apps/clipboard/ClipboardApp')),
  ide: lazy(() => import('@/apps/ide/IDEApp')),
  git: lazy(() => import('@/apps/git/GitApp')),
  apiexplorer: lazy(() => import('@/apps/apiexplorer/APIExplorerApp')),
  chat: lazy(() => import('@/apps/chat/ChatApp')),
};

/**
 * Resolve an app ID to its React component.
 * Returns null for unregistered apps (e.g. browser, notes which are not yet implemented).
 */
export function resolveAppComponent(appId: string): ComponentType | null {
  return appComponents[appId] ?? null;
}
