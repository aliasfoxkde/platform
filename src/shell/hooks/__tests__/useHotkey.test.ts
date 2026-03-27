import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHotkey } from '../useHotkey';

describe('useHotkey', () => {
  it('calls handler when matching key combo is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+k', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when combo does not match', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+k', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'l',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call handler when modifier is missing', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+k', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: false,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles shift+ctrl combos', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+shift+tab', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handles function keys without modifiers', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('f11', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'F11',
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips non-modifier events from input elements', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('escape', handler));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    // Simulate event originating from input
    Object.defineProperty(event, 'target', { value: input, writable: false });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('allows modifier events from input elements', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+k', handler));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it('allows F-key events from input elements', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('f11', handler));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'F11',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it('cleans up listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey('ctrl+k', handler));
    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
