import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithTheme, screen } from '@/test/testUtils';
import ClipboardApp from '../ClipboardApp';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock navigator.clipboard
Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: {
    readText: vi.fn().mockResolvedValue(''),
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

describe('ClipboardApp', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('renders empty state initially', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByText('Clipboard is empty')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('pinned')).toBeInTheDocument();
    expect(screen.getByText('recent')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders the capture button', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByText('Capture Current Clipboard')).toBeInTheDocument();
  });

  it('shows max history count', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('renders the Clear button', () => {
    renderWithTheme(<ClipboardApp />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});
