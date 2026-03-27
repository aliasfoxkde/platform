import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClickOutside } from '../useClickOutside';
import { createRef } from 'react';

describe('useClickOutside', () => {
  it('calls handler when clicking outside the ref element', () => {
    const handler = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    renderHook(() => useClickOutside(ref, handler));

    // Click on body (outside the container)
    const event = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(container);
  });

  it('does not call handler when clicking inside the ref element', () => {
    const handler = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    renderHook(() => useClickOutside(ref, handler));

    // Click inside the container
    const event = new MouseEvent('mousedown', { bubbles: true });
    container.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it('does not add listener when handler is undefined', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ fn }) => useClickOutside(ref, fn),
      { initialProps: { fn: undefined as ((e: MouseEvent) => void) | undefined } },
    );

    // Click outside — handler should not fire since it was undefined
    const event = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    // Now provide a handler
    rerender({ fn: handler });

    // Click outside — should fire now
    document.body.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });

  it('handles null ref gracefully without throwing', () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();
    // ref.current is null

    renderHook(() => useClickOutside(ref, handler));

    const event = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(event);

    // Should not throw — null ref means no element to check, so handler is not called
    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    const handler = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { unmount } = renderHook(() => useClickOutside(ref, handler));
    unmount();

    const event = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });
});
