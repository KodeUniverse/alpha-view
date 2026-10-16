/**
 * Calendar-day comparison on local time parts.
 *
 * Alpaca returns exchange-local timestamps for US equities, so comparing against
 * `new Date()`'s local parts is what keeps a bar stamped with an offset on the
 * right day regardless of the viewer's timezone.
 *
 * Note this is a *calendar* day check, not a trading-session check -- it has no
 * notion of weekends or holidays.
 */
export function isSameTradingDay(time: Date, reference: Date): boolean {
  return (
    time.getFullYear() === reference.getFullYear() &&
    time.getMonth() === reference.getMonth() &&
    time.getDate() === reference.getDate()
  );
}