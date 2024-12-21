'use client';

import React, { useState } from 'react';

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

const streamingServices = [
  {
    name: 'Netflix',
    count: 156,
    logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
    defaultColor: '#E50914', // Netflix red
  },
  {
    name: 'HBO Max',
    count: 142,
    logo: 'https://image.tmdb.org/t/p/w92/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg',
    defaultColor: '#0046FF', // MAX blue
  },
  {
    name: 'Paramount+',
    count: 128,
    logo: 'https://image.tmdb.org/t/p/w92/h5DcR0J2EESLitnhR8xLG1QymTE.jpg',
    defaultColor: '#0072D8', // Paramount blue
  },
  {
    name: 'Apple TV+',
    count: 112,
    logo: 'https://image.tmdb.org/t/p/w92/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg',
    defaultColor: '#000000', // Apple black
  },
  {
    name: 'Prime Video',
    count: 98,
    logo: 'https://image.tmdb.org/t/p/w92/pvske1MyAoymrs5bguRfVqYiM9a.jpg',
    defaultColor: '#00A8E1', // Prime blue
  },
  {
    name: 'Disney+',
    count: 86,
    logo: 'https://image.tmdb.org/t/p/w92/97yvRBw1GzX7fXprcF80er19ot.jpg',
    defaultColor: '#0E47BA', // Disney+ blue
  },
  {
    name: 'BBC iPlayer',
    count: 74,
    logo: 'https://image.tmdb.org/t/p/w92/nc8Tpsr8SqCbsTUogPDD06gGzB3.jpg',
    defaultColor: '#FF4E98', // BBC pink
  },
  {
    name: 'ITVX',
    count: 68,
    logo: 'https://image.tmdb.org/t/p/w92/1LuvKw01c2KQCt6DqgAgR06H2pT.jpg',
    defaultColor: '#C8DD31', // ITVX lime green
  },
  {
    name: 'Videoland',
    count: 38,
    logo: 'https://image.tmdb.org/t/p/w92/qN7uDYanT47WI0MmbwOr5HFFot.jpg',
    defaultColor: '#FF0018', // Videoland red
  },
].sort((a, b) => b.count - a.count);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, defaultColor } = payload[0].payload;
    return (
      <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
        <div className="mb-1 font-medium text-white">{name}</div>
        <div className="flex items-center gap-1">
          <div
            className="mr-1 h-3 w-3 rounded-sm"
            style={{ backgroundColor: defaultColor }}
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
};

const CustomLabel = (props) => {
  const { x, y, value, index, focusBar, height } = props;
  const centerY = y + height / 2;
  const isActive = focusBar === index;
  const data = streamingServices[index];

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
      <image
        x={x + 16}
        y={centerY - 12}
        width="24"
        height="24"
        href={data.logo}
        clipPath={`url(#roundedImage-${index})`}
        style={{
          transition: 'filter 0.2s, opacity 0.2s',
          filter: isActive ? 'none' : `url(#grayscale-${index})`,
          opacity: isActive ? 1 : 0.5,
        }}
      />
      <text
        x={x + 48}
        y={centerY}
        fontSize={11}
        fill={isActive ? '#fff' : '#999'}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ transition: 'fill 0.2s' }}
      >
        {value}
      </text>
    </g>
  );
};

const BAR_SIZE = 40;
const BAR_GAP = 6;

export default function StreamingServicesChart() {
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
          data={streamingServices}
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
          <Bar dataKey="count" minPointSize={2}>
            {streamingServices.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={focusBar === index ? entry.defaultColor : '#333333'}
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
