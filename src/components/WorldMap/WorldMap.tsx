// Note: heavily inspired by https://github.com/react-map/react-map/blob/master/packages/world/src/World.tsx
'use client';

import { type ReactNode, useCallback, useEffect, useId, useState } from 'react';

import { cx } from 'class-variance-authority';
import { motion, AnimatePresence } from 'framer-motion';

import { countries, paths } from './constants';

type CountryData = Readonly<{
  color: string;
  hoverColor?: string;
  strokeColor?: string;
  content?: unknown;
}>;

export default function WorldMap({
  className,
  defaultColor = '#333333',
  defaultHoverColor = '#444444',
  defaultStrokeColor = '#222222',
  data = {},
  renderTooltip,
}: Readonly<{
  className?: string;
  defaultColor?: string;
  defaultHoverColor?: string;
  defaultStrokeColor?: string;
  data?: Record<string, CountryData>;
  renderTooltip?: (
    payload: Readonly<{
      country: string;
      color: string;
      hoverColor: string;
      strokeColor: string;
      content: unknown;
    }>,
  ) => ReactNode;
}>) {
  const instanceId = useId().replace(/:/g, '');
  const [viewBox, setViewBox] = useState<string>('0 0 100 100');
  const [tooltipData, setTooltipData] = useState<{
    country: string;
    color: string;
    hoverColor: string;
    strokeColor: string;
    content: unknown;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const svg = document.getElementById(
      `svg2-${instanceId}`,
    ) as SVGGraphicsElement | null;

    if (svg) {
      const bbox = svg.getBBox();
      setViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }
  }, [instanceId]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, country: string) => {
      const countryData = data[country];

      const svgElement = document.getElementById(`svg2-${instanceId}`);
      if (!svgElement) {
        return;
      }

      const rect = svgElement.getBoundingClientRect();
      setTooltipData({
        country,
        color: countryData?.color ?? defaultColor,
        hoverColor: countryData?.hoverColor ?? defaultHoverColor,
        strokeColor: countryData?.strokeColor ?? defaultStrokeColor,
        content: countryData?.content ?? null,
        x: e.clientX - rect.left + 10, // little offset
        y: e.clientY - rect.top + 10, // little offset
      });
    },
    [data, defaultColor, defaultHoverColor, defaultStrokeColor, instanceId],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  return (
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
            id={`${name}-${instanceId}`}
            d={paths[name as keyof typeof paths]}
            style={{
              strokeWidth: 1,
              stroke: data[name]?.strokeColor ?? defaultStrokeColor,
              cursor: 'pointer',
            }}
            initial={{ fill: data[name]?.color ?? defaultColor }}
            whileHover={{ fill: data[name]?.hoverColor ?? defaultHoverColor }}
            onMouseMove={(e) => handleMouseMove(e, name)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>

      {renderTooltip && tooltipData && (
        <AnimatePresence>
          <motion.div
            className="pointer-events-none absolute left-0 top-0"
            initial={{ opacity: 0, x: tooltipData.x - 20, y: tooltipData.y }}
            animate={{
              opacity: 1,
              x: tooltipData.x,
              y: tooltipData.y,
            }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'tween',
              duration: 0.1,
              ease: 'linear',
            }}
          >
            {renderTooltip({
              country: tooltipData.country,
              color: tooltipData.color,
              hoverColor: tooltipData.hoverColor,
              strokeColor: tooltipData.strokeColor,
              content: tooltipData.content,
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
