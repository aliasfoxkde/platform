/**
 * TabBar — horizontal tab strip with active indicator, close button.
 */

import { type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  modified?: boolean;
  icon?: ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose?: (id: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTabId, onTabChange, onTabClose, className = '' }: TabBarProps) {
  return (
    <div
      className={`flex items-center bg-[hsl(var(--surface-secondary))] border-b border-[hsl(var(--border))] overflow-x-auto ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer group transition-colors whitespace-nowrap border-b-2 ${
            tab.id === activeTabId
              ? 'border-b-[hsl(var(--accent))] text-[hsl(var(--text))] bg-[hsl(var(--surface))]'
              : 'border-b-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--surface))]/50'
          }`}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>
          {tab.modified && (
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] shrink-0" />
          )}
          {onTabClose && (
            <span
              role="button"
              aria-label={`Close ${tab.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-[hsl(var(--destructive))] text-xs cursor-pointer"
            >
              x
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
