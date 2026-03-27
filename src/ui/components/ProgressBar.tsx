/**
 * ProgressBar — determinate and indeterminate progress bar.
 */

interface ProgressBarProps {
  value?: number; // 0-100 for determinate
  max?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, max = 100, className = '', label }: ProgressBarProps) {
  const pct = value !== undefined ? Math.min(100, Math.max(0, (value / max) * 100)) : undefined;
  const isIndeterminate = value === undefined;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[hsl(var(--text-secondary))]">{label}</span>
          {!isIndeterminate && (
            <span className="text-xs text-[hsl(var(--text-secondary))] tabular-nums">{Math.round(pct!)}%</span>
          )}
        </div>
      )}
      <div className="h-1.5 bg-[hsl(var(--surface-secondary))] rounded-full overflow-hidden">
        <div
          className={`h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300 ${
            isIndeterminate ? 'animate-loading-bar' : ''
          }`}
          style={!isIndeterminate ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  );
}
