/**
 * useHotkey — register global keyboard shortcuts.
 *
 * @param keyCombo  - Key combo string, e.g. 'ctrl+k', 'ctrl+shift+t', 'f11'
 * @param handler  - Callback when the combo is pressed
 * @param options  - { disabled } to temporarily disable
 */

import { useEffect, useRef } from 'react';

interface ParsedCombo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split('+');
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
  };
}

function matchesEvent(combo: ParsedCombo, e: KeyboardEvent): boolean {
  if (combo.ctrl !== e.ctrlKey) return false;
  if (combo.shift !== e.shiftKey) return false;
  if (combo.alt !== e.altKey) return false;
  if (combo.meta !== e.metaKey) return false;
  return e.key.toLowerCase() === combo.key;
}

export function useHotkey(
  keyCombo: string,
  handler: (e: KeyboardEvent) => void,
  options?: { disabled?: boolean },
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (options?.disabled) return;

    const combo = parseCombo(keyCombo);

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow F-keys and combos with ctrl/meta even in inputs
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
        const isFunctionKey = e.key.startsWith('F');
        if (!hasModifier && !isFunctionKey) return;
      }

      if (matchesEvent(combo, e)) {
        e.preventDefault();
        handlerRef.current(e);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyCombo, options?.disabled]);
}
