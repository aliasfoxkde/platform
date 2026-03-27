/**
 * Test utilities — wrapper components and helpers for app tests.
 */

import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';

/** Minimal wrapper that provides CSS custom properties for tests. */
function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        // Provide the CSS custom properties that components expect
        '--surface': '0 0% 100%',
        '--surface-secondary': '210 40% 96%',
        '--surface-foreground': '222 47% 11%',
        '--surface-bright': '210 40% 96%',
        '--text': '222 47% 11%',
        '--text-secondary': '215 16% 47%',
        '--border': '214 32% 91%',
        '--border-bright': '214 32% 80%',
        '--muted': '210 40% 96%',
        '--muted-foreground': '215 20% 65%',
        '--accent': '221 83% 53%',
        '--accent-foreground': '0 0% 100%',
        '--destructive': '0 84% 60%',
        '--destructive-foreground': '0 0% 100%',
        '--background': '0 0% 98%',
        '--foreground': '222 47% 11%',
        '--radius': '0.5rem',
        '--blur': '12px',
        '--transition': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** Render with the test wrapper providing CSS custom properties. */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

/** Re-export everything from testing-library for convenience. */
export { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
export { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
