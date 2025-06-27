'use client';

import { memo, useCallback, useState } from 'react';

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
    name: string;
    count: number;
    logo?: string | null;
    defaultColor: string;
  }[];
}>;

function MostWatchedProviders({ data }: Props) {
  const [focusBar, setFocusBar] = useState(null);
  const renderContent = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: sort out later
    (props: any) => {
      const { x, y, value, index, height } = props;
      const centerY = y + height / 2;
      const isActive = focusBar === index;
      const styles = {
        filter: isActive ? 'none' : 'grayscale(100%)',
        opacity: isActive ? 1 : 0.5,
        transition: 'filter 0.2s, opacity 0.2s',
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
              <rect height="24" rx="4" width="24" x={x + 16} y={centerY - 12} />
            </clipPath>
          </defs>
          {logo && (
            <image
              clipPath={`url(#roundedImage-${index})`}
              height="24"
              href={logo}
              style={styles}
              width="24"
              x={x + 16}
              y={centerY - 12}
            />
          )}
          <text
            dominantBaseline="middle"
            fill={isActive ? '#fff' : '#999'}
            fontSize={11}
            textAnchor="start"
            x={x + 48}
            y={centerY}
          >
            {value}
          </text>
        </g>
      );
    },
    [data, focusBar],
  );

  // biome-ignore lint/suspicious/noExplicitAny: sort out later
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

  // biome-ignore lint/suspicious/noExplicitAny: sort out later
  const handleMouseMove = useCallback((state: any) => {
    if (state?.isTooltipActive) {
      setFocusBar(state.activeTooltipIndex);
    } else {
      setFocusBar(null);
    }
  }, []);

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
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <CartesianGrid
          horizontal={false}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3 3"
          vertical={true}
        />
        <YAxis
          axisLine={false}
          dataKey="name"
          hide
          tickLine={false}
          type="category"
        />
        <XAxis domain={[0, 'dataMax']} hide tickCount={12} type="number" />
        <Tooltip content={renderTooltip} cursor={false} />
        <Bar dataKey="count" minPointSize={2} radius={[4, 4, 4, 4]}>
          {data.map((entry, index) => (
            <Cell
              fill={focusBar === index ? entry.defaultColor : '#333333'}
              key={`cell-${index}`}
            />
          ))}
          <LabelList content={renderContent} dataKey="name" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(MostWatchedProviders);
