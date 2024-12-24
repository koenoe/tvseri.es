'use client';

import { useCallback } from 'react';

import {
  setISOWeek,
  startOfWeek,
  endOfWeek,
  setYear,
  format,
  isSameMonth,
  getISOWeek,
  startOfYear,
  endOfYear,
  getISOWeekYear,
} from 'date-fns';
import {
  Bar,
  BarChart,
  Tooltip,
  XAxis,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const BAR_SIZE = 32;
const BAR_GAP = 6;

/**
 * Gets the week information for a given visual week position in the chart
 *
 * The chart always shows weeks 1-53 for visual consistency, but the actual
 * ISO week numbers might be different, especially at year boundaries.
 *
 * Examples:
 * - 2022: Visual week 1 shows Week 52 (2021) with "Jan 1 – 2" because week 1 starts Jan 3
 * - 2023: Visual week 1 shows Week 52 (2022) with "Jan 1" because week 1 starts Jan 2
 * - 2024: Visual week 53 shows Week 1 (2025) with "Dec 30 – 31"
 *
 * @param year - The year we're displaying
 * @param visualWeek - The week position in the chart (1-53)
 * @returns Object containing actual ISO week number, date range string, and display year if different
 */
function getWeekInfo(
  year: number,
  visualWeek: number,
): {
  actualWeek: number;
  dateRange: string;
  displayYear: number | null;
} {
  // Convert visual week position to a date by starting at Jan 1
  // and adding the appropriate number of days
  const date = new Date(year, 0, 1);
  date.setDate(date.getDate() + (visualWeek - 1) * 7);

  // Get the actual ISO week number and year for this date
  // These might be different from our visual position/year
  const actualWeek = getISOWeek(date);
  const isoWeekYear = getISOWeekYear(date);

  // Get the start/end dates for this ISO week
  let weekDate = setYear(new Date(), year);
  weekDate = setISOWeek(weekDate, actualWeek);
  let startDate = startOfWeek(weekDate, { weekStartsOn: 1 });
  let endDate = endOfWeek(weekDate, { weekStartsOn: 1 });

  // Get the boundaries of our display year
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  let displayYear = null;

  // Handle special cases at year boundaries
  if (visualWeek === 1 && isoWeekYear < year) {
    // We're showing the first visual week but it's actually the last week of previous year
    startDate = yearStart; // Always start at Jan 1

    // Find when week 1 actually starts by getting the week containing Jan 4
    // (according to ISO 8601, Jan 4 is always in week 1)
    const firstWeekStart = startOfWeek(new Date(year, 0, 4), {
      weekStartsOn: 1,
    });
    endDate = new Date(firstWeekStart);
    endDate.setDate(endDate.getDate() - 1);

    displayYear = year - 1; // Show previous year in the tooltip
  } else if (visualWeek >= 52 && actualWeek === 1) {
    // We're showing the last visual week but it's actually week 1 of next year
    startDate = new Date(year, 11, 30); // Show Dec 30-31
    endDate = yearEnd;
    displayYear = year + 1; // Show next year in the tooltip
  } else {
    // Normal case - just cap the dates to our year if needed
    if (startDate < yearStart) startDate = yearStart;
    if (endDate > yearEnd) endDate = yearEnd;
  }

  // Format the date range, handling single-day special cases
  const dateRange =
    startDate.getTime() === endDate.getTime()
      ? format(startDate, 'MMM d') // Single day (e.g., "Jan 1")
      : isSameMonth(startDate, endDate)
        ? `${format(startDate, 'MMM d')} – ${format(endDate, 'd')}` // Same month (e.g., "Jan 1 – 2")
        : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`; // Different months (e.g., "Dec 30 – Jan 2")

  return {
    actualWeek,
    displayYear,
    dateRange,
  };
}

export default function WatchedPerWeek({
  data,
  year,
}: Readonly<{
  data: { week: number; episodes: number }[];
  year: number;
}>) {
  const renderTooltip = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const { actualWeek, dateRange, displayYear } = getWeekInfo(
          year,
          parseInt(label, 10),
        );

        return (
          <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
            <div className="mb-1 font-medium text-white">
              Week {actualWeek}
              {displayYear ? ` (${displayYear})` : ''}
            </div>
            <div className="mb-1 text-[0.65rem] text-zinc-500">{dateRange}</div>
            <div className="flex items-center gap-1">
              <div className="mr-1 h-3 w-3 rounded-sm bg-[#D60073]" />
              <span className="text-zinc-400">Episodes</span>
              <span className="ml-auto font-medium text-white">
                {payload[0].value}
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    [year],
  );

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <BarChart data={data} barGap={BAR_GAP} barSize={BAR_SIZE}>
        <CartesianGrid
          vertical={false}
          horizontal={true}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={true}
          ticks={[1, 53]}
          tickFormatter={(value) => (value === 1 ? 'Jan' : 'Dec')}
          tickMargin={10}
          className="text-[0.55rem] text-white/60 md:text-[0.65rem] xl:text-sm"
          strokeWidth={0}
        />
        <Tooltip
          content={renderTooltip}
          cursor={{ fill: 'rgba(255, 255, 255, 0.1)', radius: 2 }}
          animationDuration={200}
        />
        <Bar
          dataKey="episodes"
          fill="#D60073"
          minPointSize={1}
          radius={[2, 2, 2, 2]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
