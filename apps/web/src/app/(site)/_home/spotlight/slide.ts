import type { TvSeries } from '@tvseri.es/schemas';

import { toPageColor } from '@/components/background/pageColor';
import showPath from '@/lib/routing/showPath';

import { firstGenre } from '../genres';
import { showSeasons } from '../showFacts';
import { hookLine } from './hookLine';

/** What the client island needs for one slide: no more than it draws */
export type Slide = Readonly<{
  backdrop: string;
  /** the page colour while this slide shows (a safe six-digit hex) */
  color: string;
  genre: string;
  hook: string;
  href: string;
  id: number;
  logo: string;
  /** the logo's width / height, when the API knows it (its box is held before it loads) */
  logoRatio: number | null;
  rank: string;
  seasons: string;
  title: string;
  year: string;
}>;

const logoRatioOf = (series: TvSeries): number | null => {
  const ratio = series.titleTreatmentAspectRatio;
  return series.titleTreatmentImage &&
    typeof ratio === 'number' &&
    Number.isFinite(ratio) &&
    ratio > 0
    ? ratio
    : null;
};

/**
 * One trending show as a spotlight slide; `index` is its place in the ten,
 * `day` the page's day (`YYYY-MM-DD`) the hook line is written for
 */
export function toSlide(series: TvSeries, index: number, day?: string): Slide {
  return {
    backdrop: series.backdropImage ?? '',
    color: toPageColor(series.backdropColor),
    genre: firstGenre(series),
    hook: hookLine(series, day),
    href: showPath(series.id, series.slug),
    id: series.id,
    logo: series.titleTreatmentImage ?? '',
    logoRatio: logoRatioOf(series),
    rank: `#${index + 1} trending this week`,
    seasons: showSeasons(series),
    title: series.title,
    year: series.releaseYear,
  };
}
