import { Suspense } from 'react';
import { Desktop } from '@/shell/components/Desktop';
import { Window } from '@/shell/components/Window';
import { Dock } from '@/shell/components/Dock';
import { CommandPalette } from '@/shell/components/CommandPalette';
import { NotificationToast } from '@/shell/components/NotificationToast';
import { AppLauncher } from '@/shell/components/AppLauncher';
import { useWindowStore } from '@/shell/stores/windowStore';
import { useThemeStore } from '@/shell/stores/themeStore';
import { resolveAppComponent } from '@/shell/appRegistry';
import { useEffect } from 'react';

function AppLoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-[hsl(var(--background))]">
      <div className="w-5 h-5 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function WindowContent({ appId }: { appId: string }) {
  const Component = resolveAppComponent(appId);
  if (!Component) {
    return (
      <div className="flex items-center justify-center w-full h-full text-[hsl(var(--muted-foreground))]">
        <div className="text-center">
          <div className="text-4xl mb-2">🚧</div>
          <p className="text-sm">App &ldquo;{appId}&rdquo; is not yet implemented</p>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <Component />
    </Suspense>
  );
}

export default function App() {
  const windows = useWindowStore((s) => s.windows);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Initialize theme on mount
  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Desktop surface (wallpaper, icons) */}
      <Desktop />

      {/* Window layer */}
      {windows.map((win) => (
        <Window key={win.id} windowId={win.id}>
          <WindowContent appId={win.appId} />
        </Window>
      ))}

      {/* Dock (taskbar + system tray) */}
      <Dock />

      {/* Overlays */}
      <CommandPalette />
      <NotificationToast />
      <AppLauncher />
    </div>
  );
}
