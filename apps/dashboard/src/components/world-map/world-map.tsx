import { useCallback, useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RatingStatus } from '@/lib/web-vitals';
import { RATING_COLORS } from '@/lib/web-vitals';
import { DataPointsBubble, RatingPill } from '../web-vitals/data-points';
import { countries, paths } from './constants';

type CountryData = Readonly<{
  pageViews: number;
  status: RatingStatus;
  value: number | string;
}>;

type Props = Readonly<{
  className?: string;
  data: Record<string, CountryData>;
  hoveredCountry?: string | null;
  metricLabel: string;
  onCountryHover?: (country: string | null) => void;
}>;

const DEFAULT_COLOR = '#262626';
const HOVERED_INACTIVE_COLOR = '#1a1a1a';
const MIN_OPACITY = 0.4;

function getCountryFill(
  country: string,
  data: Record<string, CountryData>,
  maxPageViews: number,
  hoveredCountry: string | null,
): string {
  const countryData = data[country];
  const isHoveredCountryWithData = hoveredCountry && data[hoveredCountry];

  // Hovering a country with data greys out all the others.
  if (isHoveredCountryWithData && country !== hoveredCountry) {
    return HOVERED_INACTIVE_COLOR;
  }

  if (!countryData) {
    return DEFAULT_COLOR;
  }

  const statusColor = RATING_COLORS[countryData.status].hsl;
  const baseHsl = statusColor.match(/hsl\(([^)]+)\)/)?.[1] ?? '0, 0%, 50%';
  const [h, s] = baseHsl.split(',').map((v) => v.trim());

  if (hoveredCountry === country) {
    return `hsl(${h}, ${s}, 45%)`;
  }

  const opacity =
    MIN_OPACITY + (countryData.pageViews / maxPageViews) * (1 - MIN_OPACITY);

  // Busier countries are brighter, so traffic reads at a glance.
  const baseLightness = 45;
  const lightness = baseLightness * opacity;

  return `hsl(${h}, ${s}, ${lightness}%)`;
}

export function WorldMap({
  className,
  data,
  hoveredCountry: externalHoveredCountry,
  metricLabel,
  onCountryHover,
}: Props) {
  const instanceId = useId().replace(/:/g, '');
  const [viewBox, setViewBox] = useState('0 0 100 100');
  const [internalHoveredCountry, setInternalHoveredCountry] = useState<
    string | null
  >(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // The list beside the map can highlight a country too.
  const hoveredCountry = externalHoveredCountry ?? internalHoveredCountry;

  const maxPageViews = Math.max(
    ...Object.values(data).map((d) => d.pageViews),
    1,
  );

  useEffect(() => {
    const svg = document.getElementById(
      `world-map-${instanceId}`,
    ) as SVGGraphicsElement | null;

    if (svg) {
      const bbox = svg.getBBox();
      setViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }
  }, [instanceId]);

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<SVGPathElement>) => {
      const country = event.currentTarget.dataset.name;
      if (!country || !data[country]) return;

      setInternalHoveredCountry(country);
      onCountryHover?.(country);
    },
    [data, onCountryHover],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGPathElement>) => {
      const country = event.currentTarget.dataset.name;
      if (!country || !data[country]) return;

      const container = event.currentTarget.closest('.world-map-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - rect.left + 12,
        y: event.clientY - rect.top + 12,
      });
    },
    [data],
  );

  const handleMouseLeave = useCallback(() => {
    setInternalHoveredCountry(null);
    onCountryHover?.(null);
  }, [onCountryHover]);

  // Hovering the list highlights the map but shows no tooltip.
  const tooltipCountry = internalHoveredCountry;
  const tooltipData = tooltipCountry ? data[tooltipCountry] : null;

  const containerClasses = cn('world-map-container relative', className);

  return (
    <div className={containerClasses}>
      <svg
        id={`world-map-${instanceId}`}
        version="1.1"
        viewBox={viewBox}
        x="0px"
        y="0px"
      >
        {countries.map((name) => {
          const hasData = Boolean(data[name]);
          const fill = getCountryFill(name, data, maxPageViews, hoveredCountry);

          return (
            <path
              d={paths[name as keyof typeof paths]}
              data-name={name}
              fill={fill}
              key={name}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              style={{
                cursor: hasData ? 'pointer' : 'default',
                stroke: '#0a0a0a',
                strokeWidth: 0.75,
                transition: 'fill 150ms ease-out',
              }}
            />
          );
        })}
      </svg>

      {tooltipData && tooltipCountry ? (
        <div
          className="pointer-events-none absolute z-50 flex min-w-56 flex-col gap-1.5 text-sm"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <div className="rounded-lg border border-border bg-black px-3 py-2.5 shadow-lg">
            <p className="font-semibold text-white">{tooltipCountry}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-400">{metricLabel}</span>
              <RatingPill status={tooltipData.status}>
                {tooltipData.value}
              </RatingPill>
            </div>
          </div>
          <DataPointsBubble pageViews={tooltipData.pageViews} />
        </div>
      ) : null}
    </div>
  );
}

WorldMap.displayName = 'WorldMap';
