import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import 'server-only';

import type {
  BecauseYouWatched,
  Feature,
  FeatureOfTheDay,
  Premieres,
  Toy,
  ToyOfTheDay,
  TvSeries,
} from '@tvseri.es/schemas';
import type { FeatureKind, ToyKind } from '@tvseri.es/utils';

import { apiFetch } from '@/lib/api/client';

import { addDays, isInApiWindow } from '../../../_home/data/day';
import { getIfYouLiked, getViewerSession } from '../../../_home/data/personal';
import { onDay } from '../../../_home/data/premiereDays';

/**
 * The dev preview's reads (next dev only): the API's real answers, asked
 * per kind (`?kind=`), uncached so a reload shows the API as it is now.
 * A failure is shown as text in the preview, never thrown.
 */

export type Asked<T> = Readonly<{
  /** what the API drew; undefined when it had nothing or failed */
  value?: T;
  /** what the preview says about it */
  note: string;
}>;

const failed = (error: unknown) => `The API failed: ${String(error)}`;

export async function featureOfKind(
  kind: FeatureKind,
  today: string,
): Promise<Asked<Feature>> {
  try {
    const result = await apiFetch<FeatureOfTheDay>('/home/feature', {
      notFound: 'null',
      query: { date: today, kind, v: HOME_MOMENTS_VERSION },
    });
    if (!result) {
      return {
        note: `The API has no ${kind} today: on its day it would fall through.`,
      };
    }
    return result.feature.kind === kind
      ? { note: `Today's ${kind}, real data.`, value: result.feature }
      : {
          note: `Asked for ${kind}, the API drew ${result.feature.kind}: it doesn't know ?kind= yet (the dev stage runs an older API).`,
          value: result.feature,
        };
  } catch (error) {
    return { note: failed(error) };
  }
}

export async function toyOfKind(
  kind: ToyKind,
  today: string,
): Promise<Asked<Toy>> {
  try {
    const result = await apiFetch<ToyOfTheDay>('/home/toy', {
      notFound: 'null',
      query: { date: today, kind, v: HOME_MOMENTS_VERSION },
    });
    if (!result) {
      return {
        note: `The API has no ${kind} today: on its day it would fall through.`,
      };
    }
    return result.toy.kind === kind
      ? { note: `Today's ${kind}, real data.`, value: result.toy }
      : {
          note: `Asked for ${kind}, the API drew ${result.toy.kind}: it doesn't know ?kind= yet (the dev stage runs an older API).`,
          value: result.toy,
        };
  } catch (error) {
    return { note: failed(error) };
  }
}

/**
 * What the API really draws in a slot on `day`, when it can say (yesterday
 * to tomorrow); null further out (decided on the day)
 */
export async function slotOn(
  slot: 'feature' | 'toy',
  day: string,
): Promise<string | null> {
  if (!isInApiWindow(day)) {
    return null;
  }
  try {
    if (slot === 'feature') {
      const result = await apiFetch<FeatureOfTheDay>('/home/feature', {
        notFound: 'null',
        query: { date: day, v: HOME_MOMENTS_VERSION },
      });
      return result?.feature.kind ?? 'nothing';
    }
    const result = await apiFetch<ToyOfTheDay>('/home/toy', {
      notFound: 'null',
      query: { date: day, v: HOME_MOMENTS_VERSION },
    });
    return result?.toy.kind ?? 'nothing';
  } catch (error) {
    return failed(error);
  }
}

/** The next big premieres as the Countdown draws them, and the day it takes the slot */
export async function countdown(
  today: string,
): Promise<Asked<Feature> & Readonly<{ dueOn?: string }>> {
  try {
    const premieres = await apiFetch<Premieres>('/premieres');
    const items = onDay(premieres.countdown.items, today);
    const [first] = items;
    if (!first) {
      return { note: 'No big premiere in the next 60 days: no Countdown.' };
    }
    const due = addDays(first.date, -3);
    return {
      dueOn: due < today ? today : due,
      note: `${first.series.title} premieres ${first.date}; the Countdown takes the feature's slot from 3 days before.`,
      value: { kind: 'countdown', premieres: items },
    };
  } catch (error) {
    return { note: failed(error) };
  }
}

/**
 * The Countdown with three premieres, for looking at its pills and the
 * dissolve between them: the real big premieres, topped up with the next
 * premieres from the Premieres row (not "big": a preview only, the real
 * Countdown never shows them) until there are three.
 */
export async function countdownOfThree(today: string): Promise<Asked<Feature>> {
  try {
    const premieres = await apiFetch<Premieres>('/premieres');
    const big = onDay(premieres.countdown.items, today);
    const taken = new Set(big.map((item) => item.series.id));
    const others = onDay(premieres.items, today).filter(
      (item) => !taken.has(item.series.id) && item.series.backdropImage,
    );
    const items = [...big, ...others].slice(0, 3);
    if (items.length < 2) {
      return {
        note: 'Fewer than two premieres with artwork: nothing to switch.',
      };
    }
    return {
      note: `${big.length} of these ${items.length} are big premieres; the rest stand in from the Premieres row so the pills can be seen.`,
      value: { kind: 'countdown', premieres: items },
    };
  } catch (error) {
    return { note: failed(error) };
  }
}

/**
 * If you liked X: the viewer's own (signed in), else one built from real
 * public data (the top trending show and its recommendations), labelled so
 */
export async function ifYouLiked(
  today: string,
): Promise<Asked<BecauseYouWatched>> {
  try {
    const viewer = await getViewerSession().catch(() => null);
    if (viewer) {
      const data = await getIfYouLiked(viewer.accessToken, today);
      return data
        ? { note: 'Yours (signed in), real data.', value: data }
        : {
            note: 'Signed in, but the API has no "If you liked" for you today.',
          };
    }
    const [source] = await apiFetch<TvSeries[]>('/collection/trending');
    if (!source) {
      return { note: 'No trending show to start from.' };
    }
    const recommended = await apiFetch<TvSeries[]>(
      '/series/:id/recommendations',
      { params: { id: source.id } },
    );
    return {
      note: `Signed out: built from real data (the top trending show, ${source.title}, and its TMDB recommendations). Sign in to see yours.`,
      value: {
        items: recommended.map((series) => ({
          reason: { kind: 'recommendation', label: '' },
          series,
        })),
        source: {
          from: 'watched',
          id: source.id,
          series: source,
          title: source.title,
        },
      },
    };
  } catch (error) {
    return { note: failed(error) };
  }
}
