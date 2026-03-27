import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

import { get, set, del } from 'idb-keyval';
import { saveState, loadState, clearState, persistStore } from '../persist';

const mockedGet = vi.mocked(get);
const mockedSet = vi.mocked(set);
const mockedDel = vi.mocked(del);

describe('persist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saveState', () => {
    it('serializes and saves state to IndexedDB', async () => {
      mockedSet.mockResolvedValue(undefined);
      await saveState('test-key', { foo: 'bar' });
      expect(mockedSet).toHaveBeenCalledWith('webos:test-key', '{"foo":"bar"}');
    });

    it('handles IndexedDB errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockedSet.mockRejectedValue(new Error('quota exceeded'));
      await saveState('test-key', { foo: 'bar' });
      expect(consoleSpy).toHaveBeenCalledWith('[persist] Failed to save state for "test-key"');
      consoleSpy.mockRestore();
    });
  });

  describe('loadState', () => {
    it('deserializes stored state', async () => {
      mockedGet.mockResolvedValue('{"foo":"bar"}');
      const result = await loadState<{ foo: string }>('test-key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('returns undefined when no state stored', async () => {
      mockedGet.mockResolvedValue(undefined);
      const result = await loadState('test-key');
      expect(result).toBeUndefined();
    });

    it('returns undefined for null stored value', async () => {
      mockedGet.mockResolvedValue(null);
      const result = await loadState('test-key');
      expect(result).toBeUndefined();
    });

    it('handles IndexedDB errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockedGet.mockRejectedValue(new Error('db error'));
      const result = await loadState('test-key');
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('[persist] Failed to load state for "test-key"');
      consoleSpy.mockRestore();
    });
  });

  describe('clearState', () => {
    it('removes stored state', async () => {
      mockedDel.mockResolvedValue(undefined);
      await clearState('test-key');
      expect(mockedDel).toHaveBeenCalledWith('webos:test-key');
    });

    it('handles IndexedDB errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockedDel.mockRejectedValue(new Error('db error'));
      await clearState('test-key');
      expect(consoleSpy).toHaveBeenCalledWith('[persist] Failed to clear state for "test-key"');
      consoleSpy.mockRestore();
    });
  });

  describe('persistStore', () => {
    it('hydrates store from saved state', async () => {
      mockedGet.mockResolvedValue('{"value":42}');
      mockedSet.mockResolvedValue(undefined);

      const useStore = createMockStore({ value: 0 });
      persistStore(useStore, 'test', ['value']);

      // Flush the microtask queue for the async hydration
      await vi.runAllTimersAsync();
      expect(useStore.getState().value).toBe(42);
    });

    it('does not hydrate when no saved state', async () => {
      mockedGet.mockResolvedValue(undefined);
      mockedSet.mockResolvedValue(undefined);

      const useStore = createMockStore({ value: 99 });
      persistStore(useStore, 'test', ['value']);

      await vi.runAllTimersAsync();
      expect(useStore.getState().value).toBe(99);
    });

    it('persists only specified keys after debounce', async () => {
      mockedGet.mockResolvedValue(undefined);
      mockedSet.mockResolvedValue(undefined);

      const useStore = createMockStore({ value: 1, secret: 'hidden' });
      persistStore(useStore, 'test', ['value']);

      useStore.setState({ value: 2, secret: 'updated' });

      // Advance timers to trigger debounce
      await vi.advanceTimersByTimeAsync(350);

      expect(mockedSet).toHaveBeenCalledWith(
        'webos:test',
        '{"value":2}',
      );
    });
  });
});

function createMockStore<T extends object>(initialState: T) {
  let state = { ...initialState };
  const listeners = new Set<(s: T) => void>();

  return {
    getState: () => state,
    setState: (partial: Partial<T> | ((s: T) => Partial<T>)) => {
      const update = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...update };
      listeners.forEach((l) => l(state));
    },
    subscribe: (listener: (s: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
