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

const data = [
  { name: 'Drama', count: 156 },
  { name: 'Action & Adventure', count: 142 },
  { name: 'Comedy', count: 128 },
  { name: 'Crime', count: 112 },
  { name: 'Sci-Fi & Fantasy', count: 98 },
  { name: 'Mystery', count: 86 },
  { name: 'Documentary', count: 74 },
  { name: 'Animation', count: 68 },
  { name: 'War & Politics', count: 52 },
  { name: 'Family', count: 48 },
  { name: 'Kids', count: 42 },
  { name: 'Western', count: 38 },
].sort((a, b) => b.count - a.count);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
        <div className="mb-1 font-medium text-white">
          {payload[0].payload.name}
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

const BAR_SIZE = 30;
const BAR_GAP = 6;

const CustomLabel = ({ x, y, value, index, focusBar, height, width }) => {
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

export default function MostWatchednames() {
  const [focusBar, setFocusBar] = useState(null);

  return (
    <div className="relative h-[450px] w-full">
      <div className="mb-6 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">Streaming services</h2>
        <div className="h-[2px] flex-grow bg-white/10" />
      </div>
      <ResponsiveContainer width="100%" height="100%" maxHeight={400}>
        <BarChart
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
          barSize={BAR_SIZE}
          barGap={BAR_GAP}
          data={data}
          layout="vertical"
          onMouseMove={(state) => {
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
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
          />
          <XAxis type="number" hide domain={[0, 'dataMax']} tickCount={12} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="count">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={focusBar === index ? '#00B8D4' : '#333333'}
              />
            ))}
            <LabelList
              dataKey="name"
              content={(props) => (
                <CustomLabel {...props} focusBar={focusBar} />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
