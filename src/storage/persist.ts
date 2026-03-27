/**
 * IndexedDB persistence adapter for Zustand stores.
 *
 * Uses idb-keyval for simple key-value storage of serialized store state.
 */

import { get, set, del } from 'idb-keyval';

const PREFIX = 'webos:';

/** Serialize state to JSON and store in IndexedDB */
export async function saveState<T>(key: string, state: T): Promise<void> {
  try {
    await set(PREFIX + key, JSON.stringify(state));
  } catch {
    console.warn(`[persist] Failed to save state for "${key}"`);
  }
}

/** Load and deserialize state from IndexedDB */
export async function loadState<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await get<string>(PREFIX + key);
    if (raw === undefined || raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[persist] Failed to load state for "${key}"`);
    return undefined;
  }
}

/** Remove stored state from IndexedDB */
export async function clearState(key: string): Promise<void> {
  try {
    await del(PREFIX + key);
  } catch {
    console.warn(`[persist] Failed to clear state for "${key}"`);
  }
}

/**
 * Subscribe a Zustand store to IndexedDB persistence.
 *
 * Call this once per store after creation. It:
 * 1. Hydrates the store from IndexedDB on first call
 * 2. Debounces writes (300ms) on every state change
 * 3. Only persists the keys specified in `keys` (or all if omitted)
 */
export function persistStore<T extends object>(
  useStore: { getState: () => T; setState: (partial: Partial<T> | ((s: T) => Partial<T>)) => void; subscribe: (listener: (state: T) => void) => () => void },
  key: string,
  keys?: (keyof T)[],
) {
  let writeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Hydrate
  loadState<T>(key).then((saved) => {
    if (saved) {
      useStore.setState(saved);
    }
  });

  // Subscribe and debounce writes
  useStore.subscribe((state) => {
    if (!state) return;
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
      const current = useStore.getState();
      if (!current) return;
      const record = current as Record<string, unknown>;
      const toSave = keys
        ? Object.fromEntries(keys.filter((k) => k in record).map((k) => [k, record[k as string]]))
        : current;
      saveState(key, toSave);
    }, 300);
  });
}
