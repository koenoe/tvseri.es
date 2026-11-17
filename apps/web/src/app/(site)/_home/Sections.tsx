import { hasEnoughPosters } from '@tvseri.es/constants';
import type { ReactNode } from 'react';
import { variantBurstGlyph } from '@/components/ui/icon/glyphs';
import RowError, { SectionError } from '@/components/ui/row/RowError';
import { isUnavailable } from '@/lib/cache/unavailable';
import { getHomeControlStates } from './data/controlStates';
import { monthName } from './data/day';
import {
  getFeature,
  getHiddenGems,
  getNewThisWeek,
  getPickPool,
  getPremieres,
  getSpotlight,
  getTopPicks,
  getToy,
} from './data/home';
import Feature from './feature/Feature';
import { PICK_TITLE } from './moments';
import { TITLE as NEW_THIS_WEEK_TITLE } from './new-this-week/layout';
import NewThisWeekRow from './new-this-week/NewThisWeekRow';
import PickOneForMe from './pick/PickOneForMe';
import PremieresRow, { PREMIERES_TITLE } from './premieres/PremieresRow';
import PosterRow from './rows/PosterRow';
import Spotlight from './spotlight/Spotlight';
import Toy from './toy/Toy';

/**
 * The shared sections of home, each its own async server component so a
 * failure stays in its section (RowErrorBoundary in page.tsx). Their loaders
 * are `use cache` content prerendered into the static shell (at build time
 * too). An unavailable read (`unavailable`, revalidated after 30 s): the prerender
 * bakes the section's failed-row state (with Try again) into the
 * page until the next visit 30 s on regenerates it: never a skeleton that
 * waits forever. The sections with marking controls hand them the page's
 * one read of the viewer's states (`getHomeControlStates`), unawaited: each
 * control streams into its own Suspense hole. A section that isn't a poster row fails over its
 * `placeholder` (`SectionError`): the very node `HomeView` holds while it
 * streams, so a read that times out after 10 s moves nothing.
 */

type DayProps = Readonly<{ day: string }>;

/** A section that isn't a tile row: the page's placeholder for it, which its failure keeps */
export type PlacedProps = DayProps & Readonly<{ placeholder: ReactNode }>;

export const HIDDEN_GEMS_TITLE = 'Hidden gems';
export const HIDDEN_GEMS_SUBTITLE = 'Loved by the few who found them';
export const HIDDEN_GEMS_GLYPH = variantBurstGlyph;

/** The titles the other sections fail under (their error card), as the page's fallbacks */
export const SECTION_TITLE = {
  feature: 'Today’s feature',
  spotlight: 'Trending this week',
  toy: 'Today’s toy',
} as const;

export const topPicksTitle = (day: string) => `Top Picks for ${monthName(day)}`;

export async function SpotlightSection({ day, placeholder }: PlacedProps) {
  const items = await getSpotlight();
  if (isUnavailable(items)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={SECTION_TITLE.spotlight}
      />
    );
  }
  return items.length > 0 ? (
    <Spotlight day={day} items={items} states={getHomeControlStates(day)} />
  ) : null;
}

export async function TopPicksSection({ day }: DayProps) {
  const title = topPicksTitle(day);
  const items = await getTopPicks(day.slice(0, 7));
  if (isUnavailable(items)) {
    return (
      <RowError id="top-picks" look="home" state="unavailable" title={title} />
    );
  }
  return <PosterRow id="top-picks" items={items} title={title} />;
}

export async function PickOneSection({ day, placeholder }: PlacedProps) {
  const pool = await getPickPool(day);
  if (isUnavailable(pool)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={PICK_TITLE}
      />
    );
  }
  return pool.length > 0 ? (
    <PickOneForMe day={day} pool={pool} states={getHomeControlStates(day)} />
  ) : null;
}

export async function HiddenGemsSection({ day }: DayProps) {
  const items = await getHiddenGems(day);
  if (isUnavailable(items)) {
    return (
      <RowError
        id="hidden-gems"
        look="home"
        state="unavailable"
        subtitle={HIDDEN_GEMS_SUBTITLE}
        subtitleGlyph={HIDDEN_GEMS_GLYPH}
        title={HIDDEN_GEMS_TITLE}
      />
    );
  }
  return items.length > 0 ? (
    <PosterRow
      id="hidden-gems"
      items={items}
      subtitle={HIDDEN_GEMS_SUBTITLE}
      subtitleGlyph={HIDDEN_GEMS_GLYPH}
      title={HIDDEN_GEMS_TITLE}
    />
  ) : null;
}

export async function FeatureSection({ day, placeholder }: PlacedProps) {
  const result = await getFeature(day);
  if (isUnavailable(result)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={SECTION_TITLE.feature}
      />
    );
  }
  return result ? <Feature feature={result.feature} /> : null;
}

export async function NewThisWeekSection({ day, placeholder }: PlacedProps) {
  const items = await getNewThisWeek(day);
  if (isUnavailable(items)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={NEW_THIS_WEEK_TITLE}
      />
    );
  }
  // under three shows the row steps aside, as Premieres (MIN_POSTERS)
  return hasEnoughPosters(items.length) ? (
    <NewThisWeekRow items={items} />
  ) : null;
}

export async function PremieresSection({ day, placeholder }: PlacedProps) {
  const premieres = await getPremieres(day);
  if (isUnavailable(premieres)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={PREMIERES_TITLE}
      />
    );
  }
  // under three tickets the row steps aside (MIN_POSTERS)
  return hasEnoughPosters(premieres.length) ? (
    <PremieresRow premieres={premieres} states={getHomeControlStates(day)} />
  ) : null;
}

export async function ToySection({ day, placeholder }: PlacedProps) {
  const result = await getToy(day);
  if (isUnavailable(result)) {
    return (
      <SectionError
        placeholder={placeholder}
        state="unavailable"
        title={SECTION_TITLE.toy}
      />
    );
  }
  return result ? <Toy day={day} toy={result.toy} /> : null;
}
