// Note: heavily inspired by https://github.com/react-map/react-map/blob/master/packages/world/src/World.tsx
'use client';

import { useEffect, useId, useState } from 'react';

import { cx } from 'class-variance-authority';
import { motion } from 'framer-motion';

import { countries, paths } from './constants';

export default function WorldMap({
  className,
  defaultColor = '#333333',
  hoverColor = '#444444',
  strokeColor = '#222222',
}: Readonly<{
  className?: string;
  defaultColor?: string;
  hoverColor?: string;
  strokeColor?: string;
}>) {
  const instanceId = useId().replace(/:/g, '');
  const [viewBox, setViewBox] = useState<string>('0 0 100 100');

  useEffect(() => {
    const svg = document.getElementById(
      `svg2-${instanceId}`,
    ) as SVGGraphicsElement | null;

    if (svg) {
      const bbox = svg.getBBox();
      setViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }
  }, [instanceId]);

  return (
    <>
      <div className={cx('relative w-full', className)}>
        <svg
          className="aspect-video"
          version="1.1"
          id={`svg2-${instanceId}`}
          x="0px"
          y="0px"
          viewBox={viewBox}
        >
          {countries?.map((name, index) => (
            <motion.path
              key={index}
              // onClick={() => handleClick(code)}
              id={`${name}-${instanceId}`}
              d={paths[name as keyof typeof paths]}
              style={{
                strokeWidth: 1,
                stroke: strokeColor,
              }}
              initial={{ fill: defaultColor }}
              whileHover={{ fill: hoverColor }}
            />
          ))}
        </svg>
      </div>
    </>
  );
}
