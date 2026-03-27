/**
 * ScrollArea — styled scrollable container with custom scrollbar.
 */

import { type ReactNode } from 'react';

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className = '' }: ScrollAreaProps) {
  return (
    <div className={`overflow-y-auto scrollbar-thin ${className}`}>
      {children}
    </div>
  );
}
