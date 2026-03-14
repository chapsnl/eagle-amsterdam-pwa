const TZ = "Europe/Amsterdam";

const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric" });

export function formatEventDate(startUnix: number, endUnix: number) {
  const start = new Date(startUnix * 1000);
  const end = new Date(endUnix * 1000);

  const dateStr = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  const endTimeStr = timeFmt.format(end);
  const sameDay = dayFmt.format(start) === dayFmt.format(end);
  const endDateSuffix = sameDay ? "" : ` (${dayFmt.format(end)})`;

  return { dateStr, startTime, endTime: `${endTimeStr}${endDateSuffix}` };
}
