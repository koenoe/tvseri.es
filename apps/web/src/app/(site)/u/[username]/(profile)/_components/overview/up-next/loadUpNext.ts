import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { formatDuration } from '@tvseri.es/utils';

import type { UpNextFact } from '@/components/up-next/upNextCopy';
import { loadSeason, loadSeriesOrNull } from '@/lib/series/loaders';

import { loadCircle } from '../../../_data/circle';
import { loadOverview } from '../../../_data/overview';
import type { Profile } from '../../../_data/profile';
import { loadTrending } from '../../../_data/trending';
import { orNull } from '../../../_lib/orNull';
import { circleLine, seasonsLabel } from './heroCopy';

/** A borrowed show for an empty Up next (from your circle, else Popular this week) */
export type HeroPick = Readonly<{
  seriesId: number;
  slug: string;
  title: string;
  backdrop?: string;
  logo?: string;
  facts: ReadonlyArray<UpNextFact>;
  code: string;
  episodeTitle: string;
  /** "Not started · 26 episodes" */
  episodes: number;
}>;

const PICKS = 3;

type Candidate = Readonly<{
  id: number;
  line: string;
  circle: boolean;
  /** Popular this week: the list's own copy of the show, used when `/series/:id` has none */
  listed?: TvSeries;
}>;

/** `null`: the pick's source is down (draw the failed hero, never the small empty card) */
type Candidates = ReadonlyArray<Candidate> | null;

async function loadCandidates(profile: Profile): Promise<Candidates> {
  const circle = await orNull(loadCircle(profile));
  const fromCircle = (circle?.picks ?? []).map((pick) => ({
    circle: true,
    id: pick.show.id,
    line: circleLine(pick.kind, pick.people.length),
  }));
  if (fromCircle.length > 0) {
    return fromCircle.slice(0, PICKS);
  }
  const trending = await loadTrending();
  if (!trending) {
    return null;
  }
  return trending.slice(0, PICKS).map((show) => ({
    circle: false,
    id: show.id,
    line: 'Popular this week',
    listed: show,
  }));
}

async function toPick(candidate: Candidate): Promise<HeroPick | null> {
  const [loaded, season] = await Promise.all([
    loadSeriesOrNull(candidate.id),
    loadSeason(candidate.id, 1),
  ]);
  const series = loaded ?? candidate.listed;
  if (!series) {
    return null;
  }
  const first = season?.episodes[0];
  const facts: UpNextFact[] = [];
  if (first?.runtime) {
    facts.push({ kind: 'runtime', text: formatDuration(first.runtime) });
  }
  facts.push({
    kind: 'seasons',
    text: seasonsLabel(series),
  });
  facts.push({
    highlight: true,
    kind: candidate.circle ? 'people' : 'trending',
    text: candidate.line,
  });
  return {
    backdrop: series.backdropImage,
    code: 'S01E01',
    episodes: series.numberOfEpisodes,
    episodeTitle: first?.title ?? series.title,
    facts,
    logo: series.titleTreatmentImage,
    seriesId: series.id,
    slug: series.slug,
    title: series.title,
  };
}

/**
 * Up to three borrowed shows for an empty Up next; `null` when the source
 * (Popular this week) is unavailable.
 */
export async function loadPicks(
  profile: Profile,
): Promise<ReadonlyArray<HeroPick> | null> {
  const candidates = await loadCandidates(profile);
  if (!candidates) {
    return null;
  }
  const picks = await Promise.all(candidates.map(toPick));
  return picks.filter((pick): pick is HeroPick => pick !== null);
}

/**
 * The shows an empty Up next borrows (its pick and the two × Not now swaps
 * to), first in the order of the day-one blocks: Pick one and
 * Get started's Already seen leave these out. Empty once something is in
 * progress. Every read is the one Up next makes (memoised per render).
 */
export async function borrowedUpNextIds(
  profile: Profile,
): Promise<ReadonlySet<number>> {
  const overview = await loadOverview(profile);
  if (overview.upNext.length > 0) {
    return new Set();
  }
  const candidates = await loadCandidates(profile);
  return new Set((candidates ?? []).map((candidate) => candidate.id));
}
