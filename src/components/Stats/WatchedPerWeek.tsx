'use client';

import * as React from 'react';

import { Bar, BarChart, Tooltip, XAxis, ResponsiveContainer } from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const year = 2024;
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
      <div className="b w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
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
};

const chartData = [
  { week: 1, episodes: 0 },
  { week: 2, episodes: 0 },
  { week: 3, episodes: 0 },
  { week: 4, episodes: 0 },
  { week: 5, episodes: 1 },
  { week: 6, episodes: 0 },
  { week: 7, episodes: 2 },
  { week: 8, episodes: 0 },
  { week: 9, episodes: 1 },
  { week: 10, episodes: 0 },
  { week: 11, episodes: 2 },
  { week: 12, episodes: 1 },
  { week: 13, episodes: 0 },
  { week: 14, episodes: 2 },
  { week: 15, episodes: 0 },
  { week: 16, episodes: 1 },
  { week: 17, episodes: 2 },
  { week: 18, episodes: 1 },
  { week: 19, episodes: 3 },
  { week: 20, episodes: 2 },
  { week: 21, episodes: 1 },
  { week: 22, episodes: 2 },
  { week: 23, episodes: 3 },
  { week: 24, episodes: 2 },
  { week: 25, episodes: 4 },
  { week: 26, episodes: 3 },
  { week: 27, episodes: 8 },
  { week: 28, episodes: 12 },
  { week: 29, episodes: 9 },
  { week: 30, episodes: 14 },
  { week: 31, episodes: 11 },
  { week: 32, episodes: 15 },
  { week: 33, episodes: 10 },
  { week: 34, episodes: 13 },
  { week: 35, episodes: 12 },
  { week: 36, episodes: 16 },
  { week: 37, episodes: 11 },
  { week: 38, episodes: 14 },
  { week: 39, episodes: 13 },
  { week: 40, episodes: 12 },
  { week: 41, episodes: 15 },
  { week: 42, episodes: 13 },
  { week: 43, episodes: 10 },
  { week: 44, episodes: 14 },
  { week: 45, episodes: 12 },
  { week: 46, episodes: 11 },
  { week: 47, episodes: 15 },
  { week: 48, episodes: 13 },
  { week: 49, episodes: 12 },
  { week: 50, episodes: 14 },
  { week: 51, episodes: 11 },
  { week: 52, episodes: 13 },
  { week: 53, episodes: 11 },
];

export default function WatchedPerWeek() {
  return (
    <div className="mt-20 h-[200px] w-full">
      <div className="mb-6 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">By week</h2>
        <div className="h-[2px] flex-grow bg-white/10" />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={true}
            ticks={[1, 53]}
            tickFormatter={(value) => (value === 1 ? 'Jan' : 'Dec')}
            tickMargin={10}
            className="text-[0.65rem] text-white/60 md:text-sm"
            strokeWidth={0}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            animationDuration={200}
          />
          <Bar dataKey="episodes" fill="#D60073" minPointSize={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
