const TWENTY_FOUR_HOURS = 86_400_000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp < TWENTY_FOUR_HOURS) {
      return entry.data;
    }
    return null;
  } catch {
    return null;
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
