/**
 * Input — text input and search input variants.
 */

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  onKeyDown,
  onSubmit,
  autoFocus,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (onSubmit && e.key === 'Enter') onSubmit();
        onKeyDown?.(e);
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`px-3 py-1 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--text-secondary))] focus:outline-none focus:border-[hsl(var(--accent))] transition-colors ${className}`}
    />
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '', onKeyDown }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-secondary))] pointer-events-none"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--text-secondary))] focus:outline-none focus:border-[hsl(var(--accent))] transition-colors"
      />
    </div>
  );
}
