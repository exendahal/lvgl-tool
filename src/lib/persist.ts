/** Tiny localStorage JSON helpers — swallow errors (storage disabled/full/corrupt) since
 * persisted UI options are a convenience, never load-bearing for the app to function. */
export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadJson<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
