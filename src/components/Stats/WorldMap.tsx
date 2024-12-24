'use client';

import { useCallback, useMemo } from 'react';

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

export default function WorldMapForStats({
  className,
  data,
}: Readonly<{
  className?: string;
  data: Record<string, number>;
}>) {
  const renderTooltip = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ country, content, hoverColor }: any) => (
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
    ),
    [],
  );

  const countryData = useMemo(() => generateCountryData(data), [data]);

  return (
    <div className={cx('flex items-center justify-center', className)}>
      <WorldMap
        className="w-full md:w-3/4"
        data={countryData}
        renderTooltip={renderTooltip}
      />
    </div>
  );
}
