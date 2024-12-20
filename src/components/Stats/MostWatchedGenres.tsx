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
  { genre: 'Drama', count: 156, fill: '#00B8D4' },
  { genre: 'Action & Adventure', count: 142, fill: '#00B8D4' },
  { genre: 'Comedy', count: 128, fill: '#00B8D4' },
  { genre: 'Crime', count: 112, fill: '#00B8D4' },
  { genre: 'Sci-Fi & Fantasy', count: 98, fill: '#00B8D4' },
  { genre: 'Mystery', count: 86, fill: '#00B8D4' },
  { genre: 'Documentary', count: 74, fill: '#00B8D4' },
  { genre: 'Animation', count: 68, fill: '#00B8D4' },
  { genre: 'War & Politics', count: 52, fill: '#00B8D4' },
  { genre: 'Family', count: 48, fill: '#00B8D4' },
  { genre: 'Kids', count: 42, fill: '#00B8D4' },
  { genre: 'Western', count: 38, fill: '#00B8D4' },
].sort((a, b) => b.count - a.count);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export default function MostWatchedGenres() {
  return (
    <div className="mt-20 h-[400px] w-full">
      <div className="mb-6 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">By genre</h2>
        <div className="h-[2px] flex-grow bg-white/10" />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <YAxis
            dataKey="genre"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-196}
                    y={0}
                    className="text-[0.65rem] text-white/40 md:text-sm"
                    fill="currentColor"
                    textAnchor="start"
                    dominantBaseline="middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
            width={200}
          />
          <XAxis type="number" hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            animationDuration={200}
          />
          <Bar dataKey="count" fill="#666666" minPointSize={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
