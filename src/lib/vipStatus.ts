export type VipStatusLevel = "Regular" | "Party Boy" | "Cruiser" | "Slut";

const APP_OPENS_KEY = "eagle_app_opens";

export function calculateVipStatus(totalStampsEarned: number): VipStatusLevel {
  if (totalStampsEarned >= 50) return "Slut";
  if (totalStampsEarned >= 25) return "Cruiser";
  if (totalStampsEarned >= 10) return "Party Boy";
  return "Regular";
}

export function trackAppOpen(): void {
  try {
    const now = Date.now();
    const stored = localStorage.getItem(APP_OPENS_KEY);
    let opens: number[] = stored ? JSON.parse(stored) : [];

    // Only keep opens from the last 7 days
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    opens = opens.filter((t) => t > oneWeekAgo);
    opens.push(now);

    localStorage.setItem(APP_OPENS_KEY, JSON.stringify(opens));
  } catch {
    // Silently fail
  }
}

export function getWeeklyAppOpens(): number {
  try {
    const stored = localStorage.getItem(APP_OPENS_KEY);
    if (!stored) return 0;
    const opens: number[] = JSON.parse(stored);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return opens.filter((t) => t > oneWeekAgo).length;
  } catch {
    return 0;
  }
}
