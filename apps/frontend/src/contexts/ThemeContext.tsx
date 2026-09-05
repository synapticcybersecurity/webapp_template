/**
 * Theme context: light / dark / system.
 *
 * The template already defined a full `.dark` palette, but nothing ever added
 * the `dark` class to the document — dark mode was dead CSS. This is the piece
 * that makes it real.
 *
 * "system" is the default and is not a one-time read: it subscribes to the OS
 * preference so the app follows a mid-session switch (macOS auto light/dark at
 * sunset, for instance) without a reload.
 *
 * Note the shape: `resolved` is derived during render rather than held in
 * state. Only two things are real state — what the user picked, and what the OS
 * currently reports — and everything else follows from them. Storing `resolved`
 * separately would mean writing state from an effect on every change, which
 * costs an extra render pass and is what React 19's set-state-in-effect rule
 * warns about.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user chose, which may be 'system'. */
  mode: ThemeMode;
  /** What that currently resolves to — always concrete. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'webapp.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    // Safari in private mode throws on localStorage access rather than
    // returning null, so an unguarded read would break the whole app.
    return 'system';
  }
}

/** Subscribe to the OS colour-scheme preference as an external store. */
function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  // useSyncExternalStore is the right tool for "read a live browser value":
  // it re-renders on change without an effect writing state.
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemPrefersDark,
    () => false, // server snapshot; the pre-paint script handles the real page
  );

  const resolved: ResolvedTheme = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience; losing it must not break theming.
    }
  }, []);

  // Syncing the class onto <html> is a genuine external-system effect: it
  // touches the DOM outside React's tree rather than setting React state.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
