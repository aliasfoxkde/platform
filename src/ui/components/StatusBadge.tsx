/**
 * StatusBadge — small status indicator pill.
 */

interface StatusBadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-[hsl(var(--surface-secondary))] text-[hsl(var(--text-secondary))]',
  success: 'bg-green-500/15 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
};

export function StatusBadge({ label, variant = 'default', className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {label}
    </span>
  );
}
