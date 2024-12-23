/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  Cell,
  CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
        <div className="mb-1 font-medium text-white">
          {payload[0].payload.genre}
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-1 h-3 w-3 rounded-sm bg-[#00B8D4]" />
          <span className="text-zinc-400">Series</span>
          <span className="ml-auto font-medium text-white">
            {payload[0].value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const BAR_SIZE = 40;
const BAR_GAP = 4;

const CustomLabel = ({ x, y, value, index, focusBar, height }: any) => {
  // Calculate vertical center of the bar
  const centerY = y + height / 2;

  return (
    <text
      x={x + 16}
      y={centerY}
      fontSize={11}
      fill={focusBar === index ? '#fff' : '#999'}
      textAnchor="start"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

export default function MostWatchedGenres({
  data,
}: Readonly<{
  data: {
    genre: string;
    count: number;
  }[];
}>) {
  const [focusBar, setFocusBar] = useState(null);

  return (
    <ResponsiveContainer
      width="100%"
      height={data.length * (BAR_SIZE + BAR_GAP)}
    >
      <BarChart
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        barSize={BAR_SIZE}
        barGap={BAR_GAP}
        data={data}
        layout="vertical"
        onMouseMove={(state: any) => {
          if (state?.isTooltipActive) {
            setFocusBar(state.activeTooltipIndex);
          } else {
            setFocusBar(null);
          }
        }}
        onMouseLeave={() => setFocusBar(null)}
      >
        <CartesianGrid
          vertical={true}
          horizontal={false}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3 3"
        />
        <YAxis
          hide
          dataKey="genre"
          type="category"
          tickLine={false}
          axisLine={false}
        />
        <XAxis type="number" hide domain={[0, 'dataMax']} tickCount={12} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar dataKey="count" minPointSize={2} radius={[4, 4, 4, 4]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={focusBar === index ? '#00B8D4' : '#333333'}
            />
          ))}
          <LabelList
            dataKey="genre"
            content={(props) => <CustomLabel {...props} focusBar={focusBar} />}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
