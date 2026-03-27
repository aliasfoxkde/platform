/**
 * Core types for the WebOS shell.
 */

/** Theme mode (system defers to OS preference). */
export type ThemeMode = 'dark' | 'light' | 'system';

/** Application category for filtering/organizing. */
export type AppCategory = 'productivity' | 'system' | 'development' | 'utilities' | 'media' | 'games';

/** A registered application definition. */
export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  category: AppCategory;
  component: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  singleton?: boolean;
}

/** Window state managed by windowStore. */
export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  preMaximizeBounds?: { x: number; y: number; width: number; height: number };
  snapZone?: SnapZone;
}

/** Snap zone positions. */
export type SnapZone = 'none' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'maximized';

/** Desktop icon position on the desktop grid. */
export interface DesktopIconState {
  id: string;
  appId: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

/** Notification type for toast color coding. */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** A single notification. */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

/** A command palette command. */
export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

/** Wallpaper definition. */
export interface Wallpaper {
  id: string;
  label: string;
  type: 'gradient' | 'image' | 'solid';
  value: string;
}
