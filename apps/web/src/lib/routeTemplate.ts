/**
 * Every page route of `src/app` (route groups left out). A test fails when a
 * page is added or removed without updating this list.
 */
export const ROUTE_TEMPLATES = [
  '/',
  '/[id]/[[...slug]]',
  '/country',
  '/country/[slug]',
  '/decade/[slug]',
  '/dev/home',
  '/dev/style-guide',
  '/discover',
  '/extension',
  '/genre/[slug]',
  '/language',
  '/language/[slug]',
  '/network',
  '/network/[slug]',
  '/person/[id]/[[...slug]]',
  '/privacy',
  '/settings',
  '/settings/data',
  '/settings/import',
  '/settings/connected-apps',
  '/settings/profile',
  '/settings/streaming-services',
  '/sign-in/error',
  '/theme/[slug]',
  '/u/[username]',
  '/u/[username]/calendar',
  '/u/[username]/circle',
  '/u/[username]/history',
  '/u/[username]/library',
  '/u/[username]/library/all',
  '/u/[username]/library/favourites',
  '/u/[username]/library/finished',
  '/u/[username]/library/hidden',
  '/u/[username]/library/watching',
  '/u/[username]/library/watchlist',
  '/u/[username]/stats/[year]',
] as const;

// Params that only ever render a page when numeric; anything else is a 404
// (see `NOT_FOUND_REWRITE` and the pages' own checks).
const NUMERIC_PARAMS = new Set(['id', 'year']);

type Segment = Readonly<
  | { kind: 'static'; value: string }
  | { kind: 'dynamic'; numeric: boolean }
  | { kind: 'catchAll' }
  | { kind: 'optionalCatchAll' }
>;

// Lower ranks win, like Next's own route sorting.
const RANK: Readonly<Record<Segment['kind'], number>> = {
  catchAll: 2,
  dynamic: 1,
  optionalCatchAll: 3,
  static: 0,
};

const split = (pathname: string) => pathname.split('/').filter(Boolean);

function toSegment(part: string): Segment {
  if (part.startsWith('[[...')) {
    return { kind: 'optionalCatchAll' };
  }
  if (part.startsWith('[...')) {
    return { kind: 'catchAll' };
  }
  if (part.startsWith('[')) {
    return { kind: 'dynamic', numeric: NUMERIC_PARAMS.has(part.slice(1, -1)) };
  }
  return { kind: 'static', value: part };
}

const rankAt = (route: readonly Segment[], i: number) => {
  const segment = route[i];
  return segment ? RANK[segment.kind] : -1;
};

function compareRoutes(a: readonly Segment[], b: readonly Segment[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = rankAt(a, i) - rankAt(b, i);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function matches(route: readonly Segment[], parts: readonly string[]): boolean {
  for (const [i, segment] of route.entries()) {
    const part = parts[i];
    switch (segment.kind) {
      case 'optionalCatchAll':
        return true;
      case 'catchAll':
        return part !== undefined;
      case 'dynamic':
        if (part === undefined || (segment.numeric && !/^\d+$/.test(part))) {
          return false;
        }
        break;
      case 'static':
        if (part !== segment.value) {
          return false;
        }
    }
  }
  return parts.length === route.length;
}

const ROUTES = ROUTE_TEMPLATES.map((template) => ({
  segments: split(template).map(toSegment),
  template,
})).sort((a, b) => compareRoutes(a.segments, b.segments));

/**
 * The route template a pathname renders (`/1396/severance` →
 * `/[id]/[[...slug]]`), so metrics group by page type. A pathname no page
 * matches (a 404) is returned as is.
 */
export function toRouteTemplate(pathname: string): string {
  const parts = split(pathname);
  return (
    ROUTES.find(({ segments }) => matches(segments, parts))?.template ??
    pathname
  );
}
