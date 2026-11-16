import type { LibraryShelf } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import SectionHead from '@/components/ui/section/SectionHead';
import EmptyState from '../../_components/blocks/EmptyState';
import { loadPicks } from '../../_components/overview/up-next/loadUpNext';
import PickHero from '../../_components/overview/up-next/PickHero';
import PickSwitcher from '../../_components/overview/up-next/PickSwitcher';
import PickUnavailable from '../../_components/overview/up-next/PickUnavailable';
import { loadTrendingCards } from '../../_components/sidebar/start/trending';
import { type Profile, withToken } from '../../_data/profile';
import { loadSeenChoices, loadShelfPage } from '../_data/library';
import { OWNER_EMPTY as OWNER } from '../_lib/shelfEmpty';
import { SHELVES } from '../_lib/shelves';
import { FavouritePicks, PopularPicks, SeenPicks } from './EmptyPicks';

function Suggestions({
  children,
  sub,
  title,
}: Readonly<{ children: ReactNode; sub: string; title: string }>) {
  return (
    <section aria-labelledby="library-picks" className="flex flex-col gap-2">
      <SectionHead id="library-picks" size="side" title={title} />
      <p className="mb-3 text-meta text-white/60">{sub}</p>
      {children}
    </section>
  );
}

/**
 * An empty shelf: one calm line, and its own first step
 * where the board draws one: an emptied Watchlist gets Popular this week
 * with +, an empty Finished the Seen grid. Someone else's shelf only says
 * it is empty: it's their page.
 */
export default async function ShelfEmpty({
  profile,
  shelf,
}: Readonly<{ profile: Profile; shelf: LibraryShelf }>) {
  if (profile.viewer === 'visitor') {
    return (
      <EmptyState
        glyph={SHELVES[shelf].glyph}
        title={`Nothing on ${profile.user.username}’s ${SHELVES[shelf].visitorNoun} yet.`}
      />
    );
  }
  const empty = OWNER[shelf];
  const state = (
    <EmptyState glyph={empty.glyph} sub={empty.sub} title={empty.title} />
  );
  if (shelf === 'watchlist') {
    const cards = await loadTrendingCards();
    const picks = cards.slice(0, 10).map(({ id, poster, slug, title }) => ({
      id,
      poster,
      slug,
      title,
    }));
    return (
      <div className="flex flex-col gap-10">
        {state}
        {picks.length > 0 ? (
          <Suggestions
            sub="Series people are starting now. + saves one to your watchlist."
            title="Popular this week"
          >
            <PopularPicks picks={picks} />
          </Suggestions>
        ) : null}
      </div>
    );
  }
  if (shelf === 'watching') {
    return (
      <div className="flex flex-col gap-10">
        {state}
        <UpNextPick profile={profile} />
      </div>
    );
  }
  if (shelf === 'favourites') {
    const finished = await loadShelfPage(
      { ...withToken(profile), userId: profile.user.id },
      { from: null, q: '', shelf: 'finished', sort: 'recent', with: null },
    ).catch(() => null);
    const picks = (finished?.items ?? [])
      .slice(0, FAVOURITE_PICKS)
      .map(({ id, posterImage, slug, title }) => ({
        id,
        poster: posterImage,
        slug,
        title,
      }));
    return (
      <div className="flex flex-col gap-10">
        <EmptyState
          glyph={empty.glyph}
          sub={
            picks.length > 0
              ? 'Favourites lead your profile. Here are a few series you’ve finished.'
              : empty.sub
          }
          title={empty.title}
        />
        {picks.length > 0 ? <FavouritePicks picks={picks} /> : null}
      </div>
    );
  }
  if (shelf === 'finished') {
    return (
      <div className="flex flex-col gap-10">
        {state}
        <SeenSuggestions profile={profile} />
      </div>
    );
  }
  return state;
}

/**
 * Day 0's "Seen any of these?": popular posters to mark
 * as seen, under an empty Finished and under the first shows you marked.
 */
export async function SeenSuggestions({
  profile,
}: Readonly<{ profile: Profile }>) {
  const shows = await loadSeenChoices(profile);
  return shows.length > 0 ? (
    <Suggestions
      sub="Popular this week. Each one you mark lands here and stays out of your suggestions."
      title="Seen any of these?"
    >
      <SeenPicks shows={shows} />
    </Suggestions>
  ) : null;
}

/** An empty Favourites offers this many finished shows (one row of five, two on a phone) */
const FAVOURITE_PICKS = 10;

/** An empty Watching: the overview's Up next pick, dimmed until you start it */
async function UpNextPick({ profile }: Readonly<{ profile: Profile }>) {
  const picks = await loadPicks(profile);
  if (picks === null) {
    return <PickUnavailable />;
  }
  if (picks.length === 0) {
    return null;
  }
  const cards = picks.map((pick) => (
    <PickHero key={pick.seriesId} pick={pick} />
  ));
  return <PickSwitcher cards={cards} fallback={null} />;
}
