'use client';

import { cx } from 'class-variance-authority';

import WorldMap from '../WorldMap/WorldMap';

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
        <WorldMap className="w-3/4" hoverColor="#00B8D4" />
      </div>
    </div>
  );
}
