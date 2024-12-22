'use client';

import { cx } from 'class-variance-authority';

import WorldMap from '../WorldMap/WorldMap';

function generateCountryData(data: Record<string, number>) {
  const maxViews = Math.max(...Object.values(data));
  const countryData: Record<
    string,
    { color: string; hoverColor: string; content: { views: number } }
  > = {};
  const minOpacity = 0.3;

  Object.entries(data).forEach(([country, views]) => {
    const opacity = minOpacity + (views / maxViews) * (1 - minOpacity);
    countryData[country] = {
      color: `rgba(255, 0, 128, ${opacity})`,
      hoverColor: '#00B8D4',
      content: { views },
    };
  });

  return countryData;
}

const dummyData = {
  'United States': 20,
  'United Kingdom': 5,
  France: 1,
  Australia: 1,
  Japan: 3,
  Spain: 1,
  Netherlands: 2,
  Sweden: 1,
  'South Korea': 5,
};

export default function WorldMapForStats({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={cx('relative w-full', className)}>
      <div className="mb-8 flex items-center gap-x-6">
        <h2 className="text-md lg:text-lg">World map</h2>
        <div className="h-[2px] flex-grow bg-white/10" />
      </div>
      <div className="flex items-center justify-center">
        <WorldMap
          className="w-full md:w-3/4"
          data={generateCountryData(dummyData)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderTooltip={({ country, content, hoverColor }: any) => (
            <div className="w-40 rounded-lg border-0 bg-neutral-900 px-4 py-2 text-xs">
              <div className="mb-1 font-medium text-white">{country}</div>
              <div className="flex items-center gap-1">
                <div
                  className="mr-1 h-3 w-3 rounded-sm"
                  style={{
                    backgroundColor: hoverColor,
                  }}
                />
                <span className="text-zinc-400">Series</span>
                <span className="ml-auto font-medium text-white">
                  {content?.views ?? 0}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
