'use client';

import { useCallback } from 'react';

import { type WorldmapData } from '@tvseri.es/types';
import { cx } from 'class-variance-authority';
import dynamic from 'next/dynamic';

import { type Props } from '../WorldMap/WorldMap';

const WorldMap = dynamic(() => import('../WorldMap/WorldMap'), {
  ssr: false,
});

export default function WorldMapForStats({
  countries,
  paths,
  className,
  data,
}: Readonly<{
  countries: WorldmapData['countries'];
  paths: WorldmapData['paths'];
  className?: string;
  data?: Props['data'];
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

  return (
    <div className={cx('flex items-center justify-center', className)}>
      <WorldMap
        className="w-full md:w-3/4"
        countries={countries}
        paths={paths}
        data={data}
        renderTooltip={renderTooltip}
      />
    </div>
  );
}
