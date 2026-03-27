/**
 * Button — primary, secondary, ghost, and danger button variants.
 */

import { type ReactNode, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[hsl(var(--accent))] text-white hover:opacity-90',
  secondary: 'bg-[hsl(var(--surface-secondary))] text-[hsl(var(--text))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]',
  ghost: 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--surface-secondary))]',
  danger: 'bg-[hsl(var(--destructive))] text-white hover:opacity-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
