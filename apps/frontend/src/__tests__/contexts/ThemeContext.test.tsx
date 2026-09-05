import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

let matchesDark = false;
const listeners = new Set<() => void>();

function mockMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      // A getter, not a captured value: the provider re-reads `query.matches`
      // inside its change handler, so a frozen boolean would make the
      // subscription look broken when it is the mock that is stale.
      get matches() {
        return query.includes('dark') ? matchesDark : false;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  matchesDark = false;
  listeners.clear();
  // `window.localStorage`, not the bare global: Node 22 exposes its own
  // experimental `localStorage` that shadows jsdom's and is unavailable
  // without --localstorage-file. ThemeContext uses window.* for the same reason.
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  mockMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeProvider', () => {
  it('defaults to system', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.mode).toBe('system');
    expect(result.current.resolved).toBe('light');
  });

  it('resolves system to dark when the OS prefers dark', () => {
    matchesDark = true;
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies and removes the dark class on the document', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setMode('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.setMode('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the choice', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setMode('dark'));
    expect(window.localStorage.getItem('webapp.theme')).toBe('dark');
  });

  it('restores a persisted choice over the OS preference', () => {
    window.localStorage.setItem('webapp.theme', 'light');
    matchesDark = true;

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.mode).toBe('light');
    expect(result.current.resolved).toBe('light');
  });

  it('follows a mid-session OS change while in system mode', () => {
    // The reason this subscribes rather than reading once: macOS switches
    // theme at sunset, and the app should follow without a reload.
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolved).toBe('light');

    act(() => {
      matchesDark = true;
      listeners.forEach((cb) => cb());
    });

    expect(result.current.resolved).toBe('dark');
  });

  it('ignores OS changes once the user has chosen explicitly', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setMode('light'));

    act(() => {
      matchesDark = true;
      listeners.forEach((cb) => cb());
    });

    expect(result.current.resolved).toBe('light');
  });

  it('falls back to system when localStorage throws', () => {
    // Safari private mode throws rather than returning null; an unguarded read
    // would take down the whole app.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.mode).toBe('system');

    spy.mockRestore();
  });

  it('still themes when persistence fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setMode('dark'));

    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    spy.mockRestore();
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });
});
