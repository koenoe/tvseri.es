import { useCallback, useEffect, useId, useState } from 'react';
import { formatCountString } from '@/lib/api-metrics';
import type { RatingStatus } from '@/lib/web-vitals';
import { RATING_COLORS } from '@/lib/web-vitals';
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

function DataPointsIndicator({ pageViews }: { pageViews: number }) {
  // > 100 = green (3 dots), 50-100 = orange (2 dots), < 50 = red (1 dot)
  const config =
    pageViews > 100
      ? { color: 'text-green-500', dots: 3 }
      : pageViews >= 50
        ? { color: 'text-amber-500', dots: 2 }
        : { color: 'text-red-500', dots: 1 };

  return (
    <span className={`flex items-center gap-0.5 ${config.color}`}>
      {formatCountString(pageViews)}
      <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
        {config.dots >= 1 && <circle cx="5" cy="8" r="2" />}
        {config.dots >= 2 && <circle cx="10" cy="11" r="2" />}
        {config.dots >= 3 && <circle cx="10" cy="5" r="2" />}
      </svg>
    </span>
  );
}

function getCountryFill(
  country: string,
  data: Record<string, CountryData>,
  maxPageViews: number,
  hoveredCountry: string | null,
): string {
  const countryData = data[country];
  const isHoveredCountryWithData = hoveredCountry && data[hoveredCountry];

  // If a country with data is hovered, grey out everything except the hovered one
  if (isHoveredCountryWithData && country !== hoveredCountry) {
    return HOVERED_INACTIVE_COLOR;
  }

  // Country has no data - show default grey
  if (!countryData) {
    return DEFAULT_COLOR;
  }

  // Country has data - calculate color with opacity based on pageViews
  const statusColor = RATING_COLORS[countryData.status].hsl;
  const baseHsl = statusColor.match(/hsl\(([^)]+)\)/)?.[1] ?? '0, 0%, 50%';
  const [h, s] = baseHsl.split(',').map((v) => v.trim());

  // If this country is hovered, show at full brightness
  if (hoveredCountry === country) {
    return `hsl(${h}, ${s}, 45%)`;
  }

  // Calculate opacity based on pageViews (more views = more opacity)
  const opacity =
    MIN_OPACITY + (countryData.pageViews / maxPageViews) * (1 - MIN_OPACITY);

  // Convert opacity to lightness adjustment (higher opacity = higher lightness)
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

  // Use external hover state if provided, otherwise use internal
  const hoveredCountry = externalHoveredCountry ?? internalHoveredCountry;

  // Calculate max pageViews for opacity scaling
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
    (country: string) => {
      // Only allow hover on countries with data
      if (!data[country]) return;

      setInternalHoveredCountry(country);
      onCountryHover?.(country);
    },
    [data, onCountryHover],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, country: string) => {
      if (!data[country]) return;

      const container = e.currentTarget.closest('.world-map-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top + 12,
      });
    },
    [data],
  );

  const handleMouseLeave = useCallback(() => {
    setInternalHoveredCountry(null);
    onCountryHover?.(null);
  }, [onCountryHover]);

  // Only show tooltip when hovering directly on the map (internal state), not from list hover
  const tooltipCountry = internalHoveredCountry;
  const tooltipData = tooltipCountry ? data[tooltipCountry] : null;

  return (
    <div className={`world-map-container relative ${className ?? ''}`}>
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
              fill={fill}
              key={name}
              onMouseEnter={() => handleMouseEnter(name)}
              onMouseLeave={handleMouseLeave}
              onMouseMove={(e) => handleMouseMove(e, name)}
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

      {/* Custom tooltip that follows mouse */}
      {tooltipData && tooltipCountry && (
        <div
          className="pointer-events-none absolute z-50 flex min-w-56 flex-col gap-1.5 text-sm"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          {/* First bubble: Country + metric */}
          <div className="rounded-lg border border-border bg-black px-3 py-2.5 shadow-lg">
            <p className="font-semibold text-white">{tooltipCountry}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-400">{metricLabel}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${RATING_COLORS[tooltipData.status].text}`}
                style={{
                  border: `1px solid ${RATING_COLORS[tooltipData.status].hsl}`,
                }}
              >
                {tooltipData.value}
              </span>
            </div>
          </div>
          {/* Second bubble: Data points */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-black px-3 py-2 shadow-lg text-neutral-400">
            <span>Data points</span>
            <DataPointsIndicator pageViews={tooltipData.pageViews} />
          </div>
        </div>
      )}
    </div>
  );
}

WorldMap.displayName = 'WorldMap';
