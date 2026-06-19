/**
 * Free Entry promo — time-gated, global campaign (Option B).
 *
 * A single global "Free Entry" deal that appears on the VIP Member Deals
 * screen ONLY during the configured window and disappears automatically
 * afterwards. It is not stored per member: no voucher rows are created and
 * nothing needs to be cleaned up. Visibility is purely based on the current
 * time, so it also covers members who sign up during the window.
 *
 * ── ROLLBACK ──────────────────────────────────────────────────────────────
 * This feature is fully additive and self-contained. To turn it off:
 *   1. Set `enabled: false` below (one-line kill switch), OR
 *   2. Roll back to the previous Netlify deploy (Deploys → previous → Publish).
 * Either way the Member Deals screen returns to exactly its prior behaviour.
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface FreeEntryPromo {
  /** Master kill switch. Set to false to instantly hide the promo. */
  enabled: boolean;
  title: string;
  description: string;
  /**
   * Window boundaries as absolute instants. The offsets below are written
   * explicitly for Amsterdam summer time (CEST = UTC+2) so the window does
   * not drift when interpreted in UTC.
   *
   * Sunday 21 June 2026 00:00 → Monday 22 June 2026 00:00 (Amsterdam).
   */
  startsAt: string;
  endsAt: string;
}

export const FREE_ENTRY_PROMO: FreeEntryPromo = {
  enabled: true,
  title: "FREE ENTRY",
  description: "Free entry to Sunday Sex Party — today only. Show this at the door.",
  startsAt: "2026-06-21T00:00:00+02:00",
  endsAt: "2026-06-22T00:00:00+02:00",
};

/**
 * Returns true when the Free Entry promo should be visible right now.
 * Pass an explicit `now` for testing; defaults to the current time.
 */
export function isFreeEntryPromoActive(now: Date = new Date()): boolean {
  if (!FREE_ENTRY_PROMO.enabled) return false;

  const start = new Date(FREE_ENTRY_PROMO.startsAt).getTime();
  const end = new Date(FREE_ENTRY_PROMO.endsAt).getTime();
  const ts = now.getTime();

  return ts >= start && ts < end;
}
