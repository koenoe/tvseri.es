import type { ReactElement } from 'react';

import { type CountryCount, countryAlpha, dotPaths, MAP_SIZE } from './model';

const DOT = { strokeLinecap: 'round', strokeWidth: 2.6 } as const;

/**
 * The dotted world map with the year's countries lit by how many series came
 * from each: pure, data in, `<svg>` out. Each country path
 * carries a `<title>` ("United Kingdom: 13 shows"), its code as
 * `data-country` and `hoverClassName`.
 */
export function worldMapSvg({
  countries,
  hoverClassName,
  label,
}: Readonly<{
  countries: ReadonlyArray<CountryCount>;
  hoverClassName?: string;
  label: string;
}>): ReactElement {
  const mapped = countries.filter(
    (country): country is CountryCount & { code: string } => !!country.code,
  );
  const max = Math.max(1, ...countries.map((country) => country.count));
  const { base, countries: paths } = dotPaths(
    new Set(mapped.map((country) => country.code)),
  );
  // Brightest last, so it draws on top
  const lit = [...mapped].sort((a, b) => a.count - b.count);
  return (
    <svg
      aria-label={label}
      height={MAP_SIZE.height}
      role="img"
      style={{ display: 'block', height: 'auto', maxWidth: '100%' }}
      viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
      width={MAP_SIZE.width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path {...DOT} d={base} fill="none" stroke="rgba(255,255,255,0.1)" />
      {lit.map((country) => {
        const d = paths.get(country.code);
        const stroke = `rgba(255,255,255,${countryAlpha(country.count, max).toFixed(2)})`;
        const title = `${country.name}: ${country.count} series`;
        return d ? (
          <path
            {...DOT}
            className={hoverClassName}
            d={d}
            data-country={country.code}
            fill="none"
            key={country.code}
            stroke={stroke}
          >
            <title>{title}</title>
          </path>
        ) : null;
      })}
    </svg>
  );
}
