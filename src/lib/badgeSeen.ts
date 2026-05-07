// Track "seen" counts per badge key in localStorage so bottom-nav badges
// disappear after the user visits the relevant page, until new items arrive.

const EVENT = "badge-seen-update";

export function getSeen(key: string): number {
  try {
    return parseInt(localStorage.getItem(`badge_seen_${key}`) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function markSeen(key: string, count: number) {
  try {
    localStorage.setItem(`badge_seen_${key}`, String(count));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function subscribeSeen(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
