import { WHATS_ON_NETWORKS, WHERE_SET_PLACES } from '@tvseri.es/constants';
import type {
  Toy,
  ToyOfTheDay,
  WhatsOnChannel,
  WherePlace,
} from '@tvseri.es/schemas';
import {
  addDaysUtc,
  fallThroughOrder,
  TOY_KINDS as KINDS,
  rotationIndex,
  todayUtc,
  toyKindOfDay,
} from '@tvseri.es/utils';
import { fetchNetwork, getShow } from '@/lib/catalogue';
import { hasTimeForAnother } from '@/lib/deadline';
import { fetchTrending } from '@/lib/mdblist';
import { fetchDiscoverTvSeries } from '@/lib/tmdb/discover';
import { fetchTvSeriesRecommendations } from '@/lib/tmdb/series';
import { fetchWatchProviders } from '@/lib/tmdb/watchProviders';
import { mapSettledPartial } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';
import { hasArtwork } from './artwork';
import { fetchConnectedFrom } from './connectedFrom';
import {
  buildFirstKind,
  type MomentOfDay,
  type Report,
  readMomentOfDay,
} from './momentOfDay';
import { channelMarks, placeShowOrder } from './toyParts';
import { buildVersusDeck, VERSUS_MIN_VOTES, type VersusSource } from './versus';

const AIRING_DAYS = 30;
/**
 * Trending shows tried as Connected by's start, in the date's order, before
 * it gives the slot away (a cold start is at most 30 TMDB calls, once a
 * day: `fetchConnectedFrom`)
 */
const MAX_STARTS_TRIED = 3;
/** Connected by: the start's best paths, each to another end */
const CONNECTED_PATHS = 3;

export type ToyKind = (typeof KINDS)[number];
type Kind = ToyKind;

/** One show per channel: what's airing on the network now, rotating by day */
const whatsOn = async (
  date: string,
  report: Report,
): Promise<Toy | undefined> => {
  const since = new Date(`${date}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - AIRING_DAYS);
  // The service icons (one TMDB call); without them the remote's icon slots stay empty
  const providers = await fetchWatchProviders('US').catch((error: unknown) => {
    logWarn('What’s on: watch providers failed', error);
    report(1);
    return [];
  });

  /**
   * The channel's marks: its service icon on the remote (none without one),
   * its wordmark in the caption ('' when TMDB has none). The network is a
   * stored read (`fetchNetwork`), so a day's build asks TMDB only for a
   * network not read this month
   */
  const marks = async (networkId: number) => {
    const network = await fetchNetwork(networkId).catch((error: unknown) => {
      logWarn(`What’s on: network ${networkId} failed`, error);
      report(1);
      return undefined;
    });
    return channelMarks(networkId, providers, network?.logo ?? '');
  };

  const { failed, values: channels } = await mapSettledPartial(
    WHATS_ON_NETWORKS,
    async (network): Promise<WhatsOnChannel | undefined> => {
      const airing = await fetchDiscoverTvSeries({
        'air_date.gte': todayUtc(since.getTime()),
        sort_by: 'popularity.desc',
        with_networks: network.id,
      });
      // A network with nothing airing falls back to its most popular show ever
      const candidates = (
        airing.items.some(hasArtwork)
          ? airing.items
          : (
              await fetchDiscoverTvSeries({
                sort_by: 'popularity.desc',
                with_networks: network.id,
              })
            ).items
      )
        .filter(hasArtwork)
        .slice(0, 5);
      const pick =
        candidates[
          rotationIndex(date, candidates.length, `whats-on:${network.id}`)
        ];
      if (!pick) {
        return undefined;
      }
      // discover's items carry no images: the show with its artwork (its
      // logo, the admin's picks), else the discover item as it was
      const [logo, artwork] = await Promise.all([
        marks(network.id),
        getShow(pick.id, { artwork: true }).catch((error: unknown) => {
          logWarn(`What’s on: artwork for ${pick.id} failed`, error);
          report(1);
          return undefined;
        }),
      ]);
      return {
        network: { ...network, ...logo },
        series: artwork?.backdropImage ? artwork : pick,
      };
    },
  );

  report(failed);
  return channels.length > 0 ? { channels, kind: 'whats-on' } : undefined;
};

const whereSet = async (
  date: string,
  report: Report,
): Promise<Toy | undefined> => {
  const { failed, values: places } = await mapSettledPartial(
    WHERE_SET_PLACES,
    async (place): Promise<WherePlace | undefined> => {
      // The day's pick first; "More set in" steps through the others
      const ids = placeShowOrder(
        place.showIds,
        rotationIndex(date, place.showIds.length, `where:${place.slug}`),
      );
      // with artwork: the place's show is drawn with its logo when it has one
      const { failed: othersFailed, values: shows } = await mapSettledPartial(
        ids,
        (id) => getShow(id, { artwork: true }),
      );
      report(othersFailed);
      const [series, ...others] = shows.filter((show) => !!show.backdropImage);
      if (!series || series.id !== ids[0]) {
        return undefined;
      }
      return {
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        others,
        series,
        slug: place.slug,
      };
    },
  );
  report(failed);
  const featured = places[rotationIndex(date, places.length, 'where-set')];
  return featured
    ? { featured: featured.slug, kind: 'where-set', places }
    : undefined;
};

/**
 * Connected by, signed out: from one of this week's trending shows (a
 * different one each day) to well-liked shows that aren't trending, two
 * steps each. A start with no path (or failed lookups) gives way to the
 * next trending show instead of the slot. The paths are the start's shared
 * day build (`GET /home/connected` answers the same), so a signed-in viewer
 * who falls back to this start reads what this build stored.
 */
const connectedBy = async (
  date: string,
  report: Report,
): Promise<Toy | undefined> => {
  const starts = await fetchTrending();
  const first = rotationIndex(date, starts.length, 'connected');
  const tries = Math.min(MAX_STARTS_TRIED, starts.length);
  for (let i = 0; i < tries; i++) {
    // Out of time: no next start (the answer is partial, kept an hour)
    if (i > 0 && !hasTimeForAnother()) {
      report(1);
      break;
    }
    const from = starts[(first + i) % starts.length]!;
    const { partial, result } = await fetchConnectedFrom(from, date);
    if (partial) {
      report(1);
    }
    if (result && result.paths.length > 0) {
      return {
        kind: 'connected-by',
        paths: result.paths.slice(0, CONNECTED_PATHS),
      };
    }
    logWarn(`Connected by from ${from}: no path, trying the next start`, '');
  }
  return undefined;
};

const versusSource: VersusSource = {
  details: (id) => getShow(id),
  hasTime: hasTimeForAnother,
  // the most popular well-known series today: one discover page
  seeds: async () =>
    (
      await fetchDiscoverTvSeries({
        sort_by: 'popularity.desc',
        'vote_count.gte': VERSUS_MIN_VOTES,
      })
    ).items,
  similarTo: (id) => fetchTvSeriesRecommendations(id),
};

const versus = async (
  date: string,
  report: Report,
): Promise<Toy | undefined> => {
  const pairs = await buildVersusDeck(date, versusSource, report);
  return pairs.length > 0 ? { kind: 'versus', pairs } : undefined;
};

const BUILDERS: Readonly<
  Record<Kind, (date: string, report: Report) => Promise<Toy | undefined>>
> = {
  'connected-by': connectedBy,
  versus,
  'whats-on': whatsOn,
  'where-set': whereSet,
};

/**
 * The toy of the day, a day build (`readMomentOfDay`): the day's kind first,
 * then the next ones, never yesterday's kind. `result` is undefined when
 * there is nothing to show. `only` builds that one kind with no fall-through
 * (the dev preview).
 */
export const fetchToyOfTheDay = (
  date: string,
  only?: ToyKind,
): Promise<MomentOfDay<ToyOfTheDay>> =>
  readMomentOfDay({
    build: async (report) => {
      const planned = only ?? toyKindOfDay(date);
      const toy = await buildFirstKind({
        builders: BUILDERS,
        date,
        order: fallThroughOrder(
          KINDS,
          planned,
          toyKindOfDay(addDaysUtc(date, -1)),
        ).slice(0, only ? 1 : undefined),
        planned,
        report,
        slot: 'toy',
      });
      return toy ? { date, toy } : undefined;
    },
    date,
    only,
    slot: 'toy',
  });
