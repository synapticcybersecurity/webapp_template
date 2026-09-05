import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * localStorage polyfill.
 *
 * Node 22 ships an experimental `localStorage` global that shadows jsdom's and
 * is unavailable unless the process is started with `--localstorage-file`. The
 * result is that `window.localStorage` is `undefined` under jsdom while
 * `sessionStorage` works fine — so any code that reads it takes its error path
 * in tests and quietly passes for the wrong reason.
 *
 * Installing a real in-memory implementation means tests exercise the same
 * branch the browser will.
 */
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  const localStorageStub: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageStub,
  });
}

afterEach(() => {
  cleanup();
});
