const TWENTY_FOUR_HOURS = 86_400_000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCache<T>(_key: string): T | null {
  // Cache temporarily disabled
  return null;
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded – silently fail */ }
}

export function clearCache(key: string): void {
  localStorage.removeItem(key);
}
