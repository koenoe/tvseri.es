import type { LandingThemeChip, ThemeLandingFacts } from '@tvseri.es/schemas';

// The source file, not the package: Node strips types only outside node_modules.
import { themeBySlug } from '../../../../../packages/constants/src/landings';
import type { StubRoute } from '../types';

/**
 * Theme landings: `GET /discover/landing/theme/:slug/facts` (dystopia with
 * realistic numbers, every other theme a plausible stand-in), with chips
 * named as the theme list names them and the theme's strongest keyword as
 * their id, as the API sends them.
 */

/** A theme's chip, as the API names it */
export const themeChip = (slug: string, count: number): LandingThemeChip => {
  const theme = themeBySlug(slug);
  if (!theme) {
    throw new Error(`not a theme: ${slug}`);
  }
  return { count, id: theme.keywordIds[0] ?? 0, name: theme.name, slug };
};

const SCI_FI = { id: 10765, name: 'Sci-Fi & Fantasy', slug: 'sci-fi-fantasy' };
const DRAMA = { id: 18, name: 'Drama', slug: 'drama' };

/** 146 shows, mostly Sci-Fi & Fantasy and Drama, six chips, four tabs */
const dystopia: ThemeLandingFacts = {
  count: 146,
  nextDoor: [
    themeChip('survival', 2400),
    themeChip('robots-and-ai', 610),
    themeChip('politics', 980),
    themeChip('alternate-realities', 520),
  ],
  oftenTaggedWith: [
    themeChip('post-apocalyptic', 38),
    themeChip('survival', 31),
    themeChip('robots-and-ai', 24),
    themeChip('politics', 19),
    themeChip('alternate-realities', 14),
    themeChip('conspiracy', 12),
  ],
  slug: 'dystopia',
  topGenres: [
    { ...SCI_FI, count: 91, percent: 62 },
    { ...DRAMA, count: 70, percent: 48 },
  ],
  type: 'theme',
};

/** A stand-in's chips: these themes, never the landing's own */
const STAND_IN_CHIPS = [
  'coming-of-age',
  'survival',
  'small-town',
  'family-dramas',
  'conspiracy',
];

const standIn = (slug: string): ThemeLandingFacts => {
  const count = 120 + ((slug.length * 97) % 1800);
  const others = STAND_IN_CHIPS.filter((other) => other !== slug);
  return {
    count,
    nextDoor: others
      .slice(0, 3)
      .map((other, index) => themeChip(other, 2400 - index * 800)),
    oftenTaggedWith: others
      .slice(0, 4)
      .map((other, index) => themeChip(other, 30 - index * 6)),
    slug,
    topGenres: [
      { ...DRAMA, count: Math.round(count * 0.6), percent: 60 },
      { ...SCI_FI, count: Math.round(count * 0.3), percent: 30 },
    ],
    type: 'theme',
  };
};

export const routes: readonly StubRoute[] = [
  {
    handle: ({ params }) => {
      const slug = (params.slug ?? '').toLowerCase();
      if (!themeBySlug(slug)) {
        return { body: { message: 'Not Found' }, status: 404 };
      }
      return { body: slug === 'dystopia' ? dystopia : standIn(slug) };
    },
    path: '/discover/landing/theme/:slug/facts',
  },
];
