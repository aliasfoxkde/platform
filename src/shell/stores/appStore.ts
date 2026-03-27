import { create } from 'zustand';
import type { AppDefinition } from '../types';

const BUILTIN_APPS: AppDefinition[] = [
  {
    id: 'terminal',
    title: 'Terminal',
    icon: '⌨️',
    category: 'development',
    component: 'terminal',
    defaultWidth: 720,
    defaultHeight: 480,
    minWidth: 400,
    minHeight: 280,
  },
  {
    id: 'editor',
    title: 'Code Editor',
    icon: '📝',
    category: 'development',
    component: 'editor',
    defaultWidth: 900,
    defaultHeight: 640,
    minWidth: 500,
    minHeight: 350,
  },
  {
    id: 'filemanager',
    title: 'Files',
    icon: '📁',
    category: 'system',
    component: 'filemanager',
    defaultWidth: 780,
    defaultHeight: 520,
    minWidth: 450,
    minHeight: 300,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    category: 'system',
    component: 'settings',
    defaultWidth: 640,
    defaultHeight: 480,
    minWidth: 480,
    minHeight: 360,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '🧮',
    category: 'utilities',
    component: 'calculator',
    defaultWidth: 320,
    defaultHeight: 480,
    minWidth: 280,
    minHeight: 400,
  },
  {
    id: 'about',
    title: 'About',
    icon: 'ℹ️',
    category: 'system',
    component: 'about',
    defaultWidth: 480,
    defaultHeight: 360,
    minWidth: 400,
    minHeight: 300,
    singleton: true,
  },
  {
    id: 'monitor',
    title: 'System Monitor',
    icon: '📊',
    category: 'system',
    component: 'monitor',
    defaultWidth: 560,
    defaultHeight: 480,
    minWidth: 400,
    minHeight: 300,
  },
  {
    id: 'browser',
    title: 'Browser',
    icon: '🌐',
    category: 'productivity',
    component: 'browser',
    defaultWidth: 1024,
    defaultHeight: 680,
    minWidth: 500,
    minHeight: 350,
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: '📝',
    category: 'productivity',
    component: 'notes',
    defaultWidth: 520,
    defaultHeight: 640,
    minWidth: 320,
    minHeight: 400,
  },
  {
    id: 'tasks',
    title: 'Tasks',
    icon: '✅',
    category: 'productivity',
    component: 'tasks',
    defaultWidth: 800,
    defaultHeight: 560,
    minWidth: 600,
    minHeight: 400,
  },
  {
    id: 'pdfviewer',
    title: 'PDF Viewer',
    icon: '📄',
    category: 'productivity',
    component: 'pdfviewer',
    defaultWidth: 700,
    defaultHeight: 600,
    minWidth: 400,
    minHeight: 300,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    category: 'productivity',
    component: 'calendar',
    defaultWidth: 780,
    defaultHeight: 560,
    minWidth: 500,
    minHeight: 400,
  },
  {
    id: 'clipboard',
    title: 'Clipboard',
    icon: '📋',
    category: 'utilities',
    component: 'clipboard',
    defaultWidth: 420,
    defaultHeight: 520,
    minWidth: 320,
    minHeight: 300,
  },
];

interface AppState {
  apps: AppDefinition[];
  pinnedApps: string[];
  registerApp: (app: AppDefinition) => void;
  unregisterApp: (appId: string) => void;
  getApp: (appId: string) => AppDefinition | undefined;
  togglePinned: (appId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: BUILTIN_APPS,
  pinnedApps: ['terminal', 'editor', 'filemanager', 'settings', 'calculator', 'browser', 'notes', 'tasks', 'monitor', 'calendar'],
  registerApp: (app) =>
    set((state) => {
      if (state.apps.some((a) => a.id === app.id)) return state;
      return { apps: [...state.apps, app] };
    }),
  unregisterApp: (appId) =>
    set((state) => ({
      apps: state.apps.filter((a) => a.id !== appId),
      pinnedApps: state.pinnedApps.filter((id) => id !== appId),
    })),
  getApp: (appId) => get().apps.find((a) => a.id === appId),
  togglePinned: (appId) =>
    set((state) => ({
      pinnedApps: state.pinnedApps.includes(appId)
        ? state.pinnedApps.filter((id) => id !== appId)
        : [...state.pinnedApps, appId],
    })),
}));
