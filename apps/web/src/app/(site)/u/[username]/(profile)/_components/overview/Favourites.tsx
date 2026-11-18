import { formatGrouped } from '@tvseri.es/utils';
import SliceAccordion from '@/components/ui/accordion/SliceAccordion';
import SliceAccordionGhost from '@/components/ui/accordion/SliceAccordionGhost';
import { heartGlyph } from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import SectionHead from '@/components/ui/section/SectionHead';
import { libraryPath } from '@/lib/routing/profilePath';
import { loadViewerLibrary } from '../../_data/library';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import { LinkGhost } from '../blocks/LaneGhost';
import { introSlice, suggestionSlice } from './favourites/EmptySlices';
import { favouriteSlice } from './favourites/FavouriteSlice';
import { relationOf } from './favourites/favouriteFacts';
import {
  loadFavouriteCount,
  loadFavourites,
  loadFinished,
} from './favourites/loadFavourites';

/** The heart as a plain line icon, for the calm line */
const heartOutline: Glyph = { outline: heartGlyph.outline };

/**
 * Favourites: the shows you love as an accordion of backdrops, one
 * open with its facts and your history, the rest quiet slices. On someone
 * else's page it shows three facts and one pill about you instead.
 */
export default async function Favourites({
  profile,
}: Readonly<{ profile: Profile }>) {
  const viewer = profile.viewer;
  const [tiles, count, library] = await Promise.all([
    loadFavourites(profile),
    loadFavouriteCount(profile),
    viewer === 'visitor' ? loadViewerLibrary(profile) : null,
  ]);
  const now = Date.now();
  const username = profile.user.username;
  // Someone else's count opens what of theirs is new to you
  const favourites = libraryPath(
    username,
    'favourites',
    viewer === 'visitor' ? { with: 'new' } : {},
  );
  const link = <HeadLink href={favourites}>{formatGrouped(count)}</HeadLink>;

  if (tiles.length === 0) {
    return (
      <Frame>
        {viewer === 'owner' ? (
          <EmptyFavourites now={now} profile={profile} />
        ) : (
          <EmptyState
            glyph={heartOutline}
            sub={`${username} hasn’t picked any yet.`}
            title="No favourites yet"
          />
        )}
      </Frame>
    );
  }

  const slices = tiles.map((tile, index) => {
    const relation = library ? relationOf(library, tile.item.id) : null;
    const eager = index === 0;
    return {
      id: tile.item.id,
      ...favouriteSlice({ eager, now, relation, tile, viewer }),
    };
  });
  return (
    <Frame link={link}>
      <SliceAccordion slices={slices} />
    </Frame>
  );
}

/** Nothing favourited: say so, and offer shows the owner has finished */
async function EmptyFavourites({
  now,
  profile,
}: Readonly<{ now: number; profile: Profile }>) {
  const [suggestions, overview] = await Promise.all([
    loadFinished(profile),
    loadOverview(profile),
  ]);
  const withPicks = suggestions.length > 0;
  const text = withPicks
    ? "Favourites lead your profile. Here are a few series you've finished."
    : isDayZero(overview)
      ? 'Your favourites will open your profile.'
      : 'Favourites lead your profile.';
  const slices = [
    { id: 0, ...introSlice({ text, withPicks }) },
    ...suggestions.map((tile, index) => ({
      id: tile.item.id,
      ...suggestionSlice({ eager: index === 0, now, tile }),
    })),
  ];
  return <SliceAccordion slices={slices} />;
}

function Frame({
  children,
  link,
}: Readonly<{ children: React.ReactNode; link?: React.ReactNode }>) {
  return (
    <section aria-labelledby="favourites" className="flex flex-col gap-6">
      <SectionHead id="favourites" link={link} title="Favourites" />
      {children}
    </section>
  );
}

/**
 * Favourites while it streams: the real title, the count as a bar, the
 * accordion's five slices (like `loadFavourites`).
 */
export function FavouritesSkeleton() {
  const link = <LinkGhost alone width="w-8" />;
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SectionHead id="favourites-sk" link={link} title="Favourites" />
      <SliceAccordionGhost slices={5} />
    </div>
  );
}
