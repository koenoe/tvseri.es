/**
 * The month-to-date window the monitor sums CloudWatch metrics over: from
 * midnight UTC on the 1st up to (excluding) midnight UTC on the next month's
 * 1st. GetMetricData's EndTime is exclusive, so ending at the last day's
 * midnight (what `new Date(y, m + 1, 0)` gives) never counted that day.
 * UTC, not the runtime's local time, so the window is the same everywhere.
 */
export const monthWindow = (now: Date) => ({
  endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
});
