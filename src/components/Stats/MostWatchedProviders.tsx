'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const data = [
  { name: 'Netflix', count: 156, color: '#E50914' },
  { name: 'Disney+', count: 142, color: '#0063E5' },
  { name: 'Apple TV+', count: 128, color: '#000000' },
  { name: 'Hulu', count: 112, color: '#1CE783' },
  { name: 'Max', count: 98, color: '#741DED' },
  { name: 'Prime Video', count: 86, color: '#00A8E1' },
  { name: 'Paramount+', count: 74, color: '#0064FF' },
  { name: 'Peacock', count: 68, color: '#FFF047' },
  { name: 'Starz', count: 52, color: '#000000' },
  { name: 'Discovery+', count: 48, color: '#0072D6' },
  { name: 'BBC', count: 42, color: '#FFFFFF' },
].sort((a, b) => b.count - a.count);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
        <div className="mb-1 font-medium text-white">
          {payload[0].payload.name}
        </div>
        <div className="flex items-center gap-1">
          <div
            className="mr-1 h-3 w-3 rounded-sm"
            style={{ backgroundColor: payload[0].payload.color }}
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

const CustomBar = (props) => {
  const { x, y, width, height, payload } = props;
  const textColor =
    payload.color === '#FFFFFF' ||
    payload.color === '#1CE783' ||
    payload.color === '#FFF047'
      ? '#000000'
      : '#FFFFFF';

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={payload.color} />
      {width > 50 && (
        <text
          x={x + 16}
          y={y + height / 2}
          fill={textColor}
          textAnchor="start"
          dominantBaseline="central"
          className="text-[0.65rem] md:text-xs"
        >
          {payload.name}
        </text>
      )}
    </g>
  );
};

export default function MostWatchedProviders() {
  return (
    <div className="mt-20 h-[400px] w-full">
      <div className="mb-6 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">By streaming service</h2>
        <div className="h-[2px] flex-grow bg-white/10" />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <YAxis hide type="category" />
          <XAxis hide type="number" />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            animationDuration={200}
          />
          <Bar dataKey="count" minPointSize={1} shape={<CustomBar />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
