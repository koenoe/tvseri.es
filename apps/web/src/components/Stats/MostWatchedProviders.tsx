/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { memo, useCallback, useState } from 'react';

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

const BAR_SIZE = 40;
const BAR_GAP = 4;

function MostWatchedProviders({
  data,
}: Readonly<{
  data: {
    name: string;
    count: number;
    logo?: string | null;
    defaultColor: string;
  }[];
}>) {
  const [focusBar, setFocusBar] = useState(null);
  const renderContent = useCallback(
    (props: any) => {
      const { x, y, value, index, height } = props;
      const centerY = y + height / 2;
      const isActive = focusBar === index;
      const styles = {
        transition: 'filter 0.2s, opacity 0.2s',
        filter: isActive ? 'none' : 'grayscale(100%)',
        opacity: isActive ? 1 : 0.5,
      };
      const logo = data[index]!.logo;

      return (
        <g>
          <defs>
            <filter id={`grayscale-${index}`}>
              <feColorMatrix
                type="matrix"
                values="0.3333 0.3333 0.3333 0 0
                      0.3333 0.3333 0.3333 0 0
                      0.3333 0.3333 0.3333 0 0
                      0 0 0 1 0"
              />
            </filter>
            <clipPath id={`roundedImage-${index}`}>
              <rect x={x + 16} y={centerY - 12} width="24" height="24" rx="4" />
            </clipPath>
          </defs>
          {logo && (
            <image
              x={x + 16}
              y={centerY - 12}
              width="24"
              height="24"
              href={logo}
              clipPath={`url(#roundedImage-${index})`}
              style={styles}
            />
          )}
          <text
            x={x + 48}
            y={centerY}
            fontSize={11}
            fill={isActive ? '#fff' : '#999'}
            textAnchor="start"
            dominantBaseline="middle"
          >
            {value}
          </text>
        </g>
      );
    },
    [data, focusBar],
  );

  const renderTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, defaultColor } = payload[0].payload;
      return (
        <div className="w-48 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
          <div className="mb-1 font-medium text-white">{name}</div>
          <div className="flex items-center gap-1">
            <div
              className="mr-1 h-3 w-3 rounded-sm"
              style={{ backgroundColor: defaultColor ?? '#000' }}
            />
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

  const handleMouseLeave = useCallback(() => {
    setFocusBar(null);
  }, []);

  const handleMouseMove = useCallback((state: any) => {
    if (state?.isTooltipActive) {
      setFocusBar(state.activeTooltipIndex);
    } else {
      setFocusBar(null);
    }
  }, []);

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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        <Tooltip content={renderTooltip} cursor={false} />
        <Bar dataKey="count" minPointSize={2} radius={[4, 4, 4, 4]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={focusBar === index ? entry.defaultColor : '#333333'}
            />
          ))}
          <LabelList dataKey="name" content={renderContent} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(MostWatchedProviders);
