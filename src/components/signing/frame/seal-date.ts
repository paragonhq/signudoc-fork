/** "17 NOV 2026", for ring text and mono metadata (UTC, so it is stable). */
export function formatSealDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}
