import { CODES, COLS, GRID, HEIGHT, ROWS, WIDTH } from './worldDots';

/**
 * "Where the series are from": the API counts series per English country
 * name (`Intl.DisplayNames`), the map is keyed by ISO alpha-2, so names are
 * matched back to codes the same way.
 */
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

let codeByName: ReadonlyMap<string, string> | undefined;

export function countryCode(name: string): string | null {
  if (!codeByName) {
    const map = new Map<string, string>();
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const label = regionNames.of(code);
        // Current codes only: deprecated ones (DD, CS, YD) and reserved
        // ones (UK) carry the same English names; ICU canonicalises them away
        const canonical =
          Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`;
        if (canonical && label && label !== code && !map.has(label)) {
          map.set(label, code);
        }
      }
    }
    codeByName = map;
  }
  return codeByName.get(name) ?? null;
}

export type CountryCount = Readonly<{
  name: string;
  code: string | null;
  count: number;
}>;

/** Most series first; ties by name */
export function rankCountries(
  countries: Readonly<Record<string, number>>,
): ReadonlyArray<CountryCount> {
  return Object.entries(countries)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ code: countryCode(name), count, name }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * A country's dot opacity: .45 for one series up to 1 for the most, eased
 * (fitted: 44 → 1, 13 → .70, 4 → .55, 2 → .49, 1 → .45).
 */
export function countryAlpha(count: number, max: number): number {
  if (max <= 1) {
    return 1;
  }
  const share = Math.max(0, (count - 1) / (max - 1));
  return Math.round((0.45 + 0.55 * share ** 0.65) * 100) / 100;
}

export const MAP_SIZE = { height: HEIGHT, width: WIDTH } as const;

const at = (index: number) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: (((col + 0.5) * WIDTH) / COLS).toFixed(1),
    y: (((row + 0.5) * HEIGHT) / ROWS).toFixed(1),
  };
};

/**
 * Each dot as a zero-length segment (`M211.1 2.1h0`, drawn by a round cap),
 * as the map: the land without a highlighted country in one path,
 * one path per highlighted country.
 */
export function dotPaths(highlighted: ReadonlySet<string>): Readonly<{
  base: string;
  countries: ReadonlyMap<string, string>;
}> {
  let base = '';
  const countries = new Map<string, string>();
  for (let index = 0; index < GRID.length; index++) {
    const cell = GRID[index];
    if (cell === ' ' || cell === undefined) {
      continue;
    }
    const { x, y } = at(index);
    const code = cell === '#' ? null : CODES[cell.charCodeAt(0) - 0xc0];
    const dot = `M${x} ${y}h0`;
    if (code && highlighted.has(code)) {
      countries.set(code, (countries.get(code) ?? '') + dot);
    } else {
      base += dot;
    }
  }
  return { base, countries };
}
