'use client';

import { useCallback, useState } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BAR_SIZE = 40;
const BAR_GAP = 4;

export type Props = Readonly<{
  data: {
    genre: string;
    count: number;
  }[];
}>;

export default function MostWatchedGenres({ data }: Props) {
  const [focusBar, setFocusBar] = useState(null);

  // biome-ignore lint/suspicious/noExplicitAny: sort out later
  const renderTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="w-40 rounded-lg shadow-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
          <div className="mb-1 font-medium text-white">
            {payload[0].payload.genre}
          </div>
          <div className="flex items-center gap-1">
            <div className="mr-1 size-3 rounded-sm bg-[#00B8D4]" />
            <span className="text-zinc-400">Series</span>
            <span className="ml-auto font-medium text-white">
              {payload[0].value}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  const renderContent = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: sort out later
    ({ x, y, value, index, height }: any) => {
      const centerY = y + height / 2;

      return (
        <text
          dominantBaseline="middle"
          fill={focusBar === index ? '#fff' : '#999'}
          fontSize={11}
          textAnchor="start"
          x={x + 16}
          y={centerY}
        >
          {value}
        </text>
      );
    },
    [focusBar],
  );

  return (
    <ResponsiveContainer
      height={data.length * (BAR_SIZE + BAR_GAP)}
      width="100%"
    >
      <BarChart
        barGap={BAR_GAP}
        barSize={BAR_SIZE}
        data={data}
        layout="vertical"
        margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
        onMouseLeave={() => setFocusBar(null)}
        // biome-ignore lint/suspicious/noExplicitAny: sort out later
        onMouseMove={(state: any) => {
          if (state?.isTooltipActive) {
            setFocusBar(state.activeTooltipIndex);
          } else {
            setFocusBar(null);
          }
        }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3 3"
          vertical={true}
        />
        <YAxis
          axisLine={false}
          dataKey="genre"
          hide
          tickLine={false}
          type="category"
        />
        <XAxis domain={[0, 'dataMax']} hide tickCount={12} type="number" />
        <Tooltip content={renderTooltip} cursor={false} />
        <Bar dataKey="count" minPointSize={2} radius={[8, 8, 8, 8]}>
          {data.map((_entry, index) => (
            <Cell
              fill={focusBar === index ? '#00B8D4' : '#333333'}
              key={`cell-${index}`}
            />
          ))}
          <LabelList content={renderContent} dataKey="genre" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
