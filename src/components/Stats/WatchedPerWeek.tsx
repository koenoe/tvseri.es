'use client';

import { useCallback } from 'react';

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
        const nextYearFirstWeekStart = new Date(year + 1, 0, 1);
        while (nextYearFirstWeekStart.getDay() !== 1) {
          nextYearFirstWeekStart.setDate(nextYearFirstWeekStart.getDate() - 1);
        }

        let weekText, dateRange;
        const weekStart = new Date(year, 0, (label - 1) * 7 + 1);

        const formatDate = (date: Date) => {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        };

        if (weekStart < nextYearFirstWeekStart) {
          const weekEnd = new Date(year, 0, label * 7);
          weekText = `Week ${label}`;
          dateRange = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;
        } else {
          const yearEnd = new Date(year, 11, 31);
          weekText = `Week 1 (${year + 1})`;
          dateRange = `Dec ${yearEnd.getDate() - yearEnd.getDay()} – 31`;
        }

        return (
          <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
            <div className="mb-1 font-medium text-white">{weekText}</div>
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
