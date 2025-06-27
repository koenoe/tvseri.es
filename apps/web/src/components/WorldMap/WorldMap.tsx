// Note: heavily inspired by https://github.com/react-map/react-map/blob/master/packages/world/src/World.tsx
'use client';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useId, useState } from 'react';

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
        color: countryData?.color ?? defaultColor,
        content: countryData?.content ?? null,
        country,
        hoverColor: countryData?.hoverColor ?? defaultHoverColor,
        strokeColor: countryData?.strokeColor ?? defaultStrokeColor,
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
        id={`svg2-${instanceId}`}
        version="1.1"
        viewBox={viewBox}
        x="0px"
        y="0px"
      >
        {countries?.map((name, index) => (
          <motion.path
            d={paths[name as keyof typeof paths]}
            id={`${name}-${instanceId}`}
            initial={{ fill: data[name]?.color ?? defaultColor }}
            key={index}
            onMouseLeave={handleMouseLeave}
            onMouseMove={(e) => handleMouseMove(e, name)}
            style={{
              cursor: 'pointer',
              stroke: data[name]?.strokeColor ?? defaultStrokeColor,
              strokeWidth: 1,
            }}
            whileHover={{ fill: data[name]?.hoverColor ?? defaultHoverColor }}
          />
        ))}
      </svg>

      {renderTooltip && tooltipData && (
        <AnimatePresence>
          <motion.div
            animate={{
              opacity: 1,
              x: tooltipData.x,
              y: tooltipData.y,
            }}
            className="pointer-events-none absolute left-0 top-0"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, x: tooltipData.x - 20, y: tooltipData.y }}
            transition={{
              duration: 0.1,
              ease: 'linear',
              type: 'tween',
            }}
          >
            {renderTooltip({
              color: tooltipData.color,
              content: tooltipData.content,
              country: tooltipData.country,
              hoverColor: tooltipData.hoverColor,
              strokeColor: tooltipData.strokeColor,
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
