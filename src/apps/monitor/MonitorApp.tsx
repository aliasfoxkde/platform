import { useState, useEffect } from 'react';
import { useWindowStore } from '@/shell/stores/windowStore';
import { useAppStore } from '@/shell/stores/appStore';
import { listCapabilities } from '@/capabilities';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

async function getStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usage: est.usage ?? 0,
        quota: est.quota ?? 0,
      };
    } catch {
      return null;
    }
  }
  return null;
}

export default function MonitorApp() {
  const windows = useWindowStore((s) => s.windows);
  const apps = useAppStore((s) => s.apps);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [uptime, setUptime] = useState(0);
  const capabilities = listCapabilities();

  useEffect(() => {
    getStorageUsage().then(setStorage);
    const interval = setInterval(() => {
      getStorageUsage().then(setStorage);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setUptime(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const activeWindows = windows.filter((w) => !w.isMinimized);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          System Monitor
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* System Overview */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
            System
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Platform" value="WebOS 1.0.0" />
            <InfoCard label="Uptime" value={formatUptime(uptime)} />
            <InfoCard label="Open Windows" value={`${windows.length}`} />
            <InfoCard label="Active Windows" value={`${activeWindows.length}`} />
          </div>
        </section>

        {/* Storage */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
            Storage
          </h3>
          {storage ? (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">IndexedDB Usage</span>
                <span className="text-[hsl(var(--foreground))]">{formatBytes(storage.usage)}</span>
              </div>
              <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(var(--accent))]"
                  style={{
                    width: storage.quota > 0
                      ? `${Math.min(100, (storage.usage / storage.quota) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              {storage.quota > 0 && (
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {((storage.usage / storage.quota) * 100).toFixed(1)}% of {formatBytes(storage.quota)} quota
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Storage info unavailable</p>
          )}
        </section>

        {/* Open Windows */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
            Windows ({windows.length})
          </h3>
          {windows.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No windows open</p>
          ) : (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] divide-y divide-[hsl(var(--border))]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[hsl(var(--muted-foreground))]">
                    <th className="px-3 py-1.5 text-left font-medium">Title</th>
                    <th className="px-3 py-1.5 text-left font-medium">App</th>
                    <th className="px-3 py-1.5 text-right font-medium">Size</th>
                    <th className="px-3 py-1.5 text-right font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map((win) => (
                    <tr key={win.id} className="text-[hsl(var(--surface-foreground))]">
                      <td className="px-3 py-1.5">
                        <span className="mr-1.5">{win.icon}</span>
                        {win.title}
                      </td>
                      <td className="px-3 py-1.5 text-[hsl(var(--muted-foreground))]">{win.appId}</td>
                      <td className="px-3 py-1.5 text-right text-[hsl(var(--muted-foreground))]">
                        {win.width}x{win.height}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span
                          className={
                            win.isMinimized
                              ? 'text-[hsl(var(--muted-foreground))]'
                              : win.isMaximized
                                ? 'text-[hsl(var(--accent))]'
                                : 'text-[hsl(var(--foreground))]'
                          }
                        >
                          {win.isMinimized ? 'Minimized' : win.isMaximized ? 'Maximized' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Registered Capabilities */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
            Capabilities ({capabilities.length})
          </h3>
          {capabilities.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No capabilities registered</p>
          ) : (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] divide-y divide-[hsl(var(--border))]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[hsl(var(--muted-foreground))]">
                    <th className="px-3 py-1.5 text-left font-medium">Name</th>
                    <th className="px-3 py-1.5 text-left font-medium">Version</th>
                    <th className="px-3 py-1.5 text-right font-medium">Commands</th>
                    <th className="px-3 py-1.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {capabilities.map((cap) => (
                    <tr key={cap.id} className="text-[hsl(var(--surface-foreground))]">
                      <td className="px-3 py-1.5 font-medium">{cap.name}</td>
                      <td className="px-3 py-1.5 text-[hsl(var(--muted-foreground))]">v{cap.version}</td>
                      <td className="px-3 py-1.5 text-right text-[hsl(var(--muted-foreground))]">
                        {cap.commands.length}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span
                          className={
                            cap.enabled
                              ? 'text-[hsl(142,71%,45%)]'
                              : 'text-[hsl(var(--muted-foreground))]'
                          }
                        >
                          {cap.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Registered Apps */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
            Registered Apps ({apps.length})
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-xs text-[hsl(var(--surface-foreground))]"
              >
                <span>{app.icon}</span>
                <span className="truncate">{app.title}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
      <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className="text-sm font-medium text-[hsl(var(--foreground))]">{value}</div>
    </div>
  );
}
