const TWENTY_FOUR_HOURS = 86_400_000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Returns cached data only if still fresh (< 24h). */
export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TWENTY_FOUR_HOURS) {
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Returns cached data even if stale, plus a boolean indicating freshness. */
export function getCacheWithMeta<T>(key: string): { data: T | null; isStale: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { data: null, isStale: true };
    const entry: CacheEntry<T> = JSON.parse(raw);
    const isStale = Date.now() - entry.timestamp > TWENTY_FOUR_HOURS;
    return { data: entry.data, isStale };
  } catch {
    return { data: null, isStale: true };
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded – silently fail */ }
}

export function clearCache(key: string): void {
  localStorage.removeItem(key);
}
