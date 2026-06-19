import { describe, it, expect } from "vitest";
import { isFreeEntryPromoActive, FREE_ENTRY_PROMO } from "./freeEntryPromo";

describe("Free Entry promo window", () => {
  it("is hidden before the window opens", () => {
    // Saturday 20 June 2026 23:59 Amsterdam (CEST)
    expect(isFreeEntryPromoActive(new Date("2026-06-20T23:59:00+02:00"))).toBe(false);
  });

  it("is visible the whole of Sunday 21 June 2026 (Amsterdam)", () => {
    expect(isFreeEntryPromoActive(new Date("2026-06-21T00:00:00+02:00"))).toBe(true);
    expect(isFreeEntryPromoActive(new Date("2026-06-21T12:00:00+02:00"))).toBe(true);
    expect(isFreeEntryPromoActive(new Date("2026-06-21T23:59:00+02:00"))).toBe(true);
  });

  it("disappears at Monday 22 June 2026 00:00 (Amsterdam)", () => {
    expect(isFreeEntryPromoActive(new Date("2026-06-22T00:00:00+02:00"))).toBe(false);
    expect(isFreeEntryPromoActive(new Date("2026-06-22T09:00:00+02:00"))).toBe(false);
  });

  it("respects the kill switch regardless of time", () => {
    const original = FREE_ENTRY_PROMO.enabled;
    FREE_ENTRY_PROMO.enabled = false;
    expect(isFreeEntryPromoActive(new Date("2026-06-21T12:00:00+02:00"))).toBe(false);
    FREE_ENTRY_PROMO.enabled = original;
  });
});
