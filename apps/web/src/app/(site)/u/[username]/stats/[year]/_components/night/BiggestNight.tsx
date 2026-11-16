import type { StatsNight } from '@tvseri.es/schemas';
import Image from 'next/image';
import Link from 'next/link';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import {
  bingeGlyph,
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  moonGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import CardRim from '@/components/ui/tile/CardRim';
import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import { formatDuration } from '@/lib/format/duration';
import { plural } from '@/lib/format/text';
import { episodeRun } from '@/lib/marking/copy';
import showPath from '@/lib/routing/showPath';
import {
  getSeriesArt,
  getShows,
  getWhen,
  isUnavailable,
  type SeriesArt,
} from '../../_data/loaders';
import { dateMs, shortDay } from '../../_lib/weeks';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import StatsUnavailable from '../ui/StatsUnavailable';
import {
  alsoBigText,
  bingeText,
  dominantSeries,
  longDay,
  type NightSeries,
  nightLine,
  pickBinge,
} from './model';

/** The night's picture layer, on the show's colour (white at 5% without one) */
const NIGHT_PICTURE = cn(PICTURE_LAYER, 'bg-white/5');

/** The art a night's show brings, or nothing when it can't be read */
async function artOf(seriesId: number | undefined): Promise<SeriesArt | null> {
  if (seriesId === undefined) {
    return null;
  }
  const art = await getSeriesArt(seriesId);
  return isUnavailable(art) ? null : art;
}

/**
 * "Biggest night": the evening with the most
 * episodes as a backdrop card linking to the show (badge, how much of the
 * show it was, date, episodes, runtime), then "Also big" and the year's
 * longest binge. The phone shows the card alone, with the show's name.
 */
export default async function BiggestNight({ user, year }: SectionProps) {
  const [when, shows] = await Promise.all([
    getWhen(user.id, year),
    getShows(user.id, year),
  ]);
  if (isUnavailable(when)) {
    return (
      <StatsUnavailable
        id="stats-night"
        placeholder={<BiggestNightSkeleton />}
        title={'Biggest night'}
      />
    );
  }
  const night = when.biggestNight;
  const series = night ? dominantSeries(night.items) : undefined;
  if (!night || !series) {
    return null;
  }
  const otherNight = when.otherNights[0];
  const other = otherNight ? dominantSeries(otherNight.items) : undefined;
  const binge = isUnavailable(shows) ? undefined : pickBinge(shows.shows);
  const [art, otherArt, bingeArt] = await Promise.all([
    artOf(series.seriesId),
    artOf(other?.seriesId),
    artOf(binge?.id),
  ]);
  const alsoBig =
    otherNight && other
      ? alsoBigText(
          otherNight.items,
          otherNight.date,
          otherArt?.seasons ?? null,
        )
      : undefined;
  const bingeLine = binge
    ? bingeText(binge, bingeArt?.seasons ?? null)
    : undefined;
  return (
    <Lane className="max-md:p-4" id="biggest-night-title" title="Biggest night">
      <NightCard art={art} night={night} series={series} />
      <div className="flex flex-col gap-2.5 px-0.5 pt-1 max-md:hidden">
        <MetaRow>
          <MetaItem icon={moonGlyph} shrink>
            {alsoBig}
          </MetaItem>
        </MetaRow>
        <MetaRow>
          <MetaItem icon={bingeGlyph} shrink>
            {bingeLine}
          </MetaItem>
        </MetaRow>
      </div>
    </Lane>
  );
}

/**
 * The backdrop card: the show's backdrop at 70% brightness under a fade, the
 * title treatment (desktop), the episode badge with the line (desktop) or the
 * show's name (phone), and the date, episodes and runtime.
 */
function NightCard({
  art,
  night,
  series,
}: Readonly<{
  art: SeriesArt | null;
  night: StatsNight;
  series: NightSeries;
}>) {
  const href = showPath(series.seriesId, series.slug);
  const label = `${series.title}, ${plural(night.episodes, 'episode')} on ${longDay(night.date)}`;
  const line = nightLine(series.items, art?.seasons ?? null);
  // the badge: the marking core's one run format ("S02E07–E12")
  const code = episodeRun(series.items);
  const backdropColor = art?.backdropColor;
  const cardStyle = backdropColor
    ? { backgroundColor: backdropColor }
    : undefined;
  return (
    <Link
      aria-label={label}
      className="relative block h-[190px] overflow-hidden rounded-12 md:h-auto md:min-h-[230px] md:flex-1"
      href={href}
    >
      {/* the card's colour, the backdrop and its fade: one layer, clipped
          once by the corners (a colour on the link itself shows through the
          corners' part pixels) */}
      <span aria-hidden className={NIGHT_PICTURE} style={cardStyle}>
        {art?.backdropImage ? (
          <Image
            alt=""
            className="object-cover object-[center_25%] brightness-[0.7]"
            fill
            loading="lazy"
            sizes="(min-width: 768px) 33vw, 100vw"
            src={art.backdropImage}
          />
        ) : null}
        <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(15,20,20,0.92)_0%,rgba(15,20,20,0.2)_65%)] md:bg-[linear-gradient(0deg,rgba(15,20,20,0.92)_0%,rgba(15,20,20,0.3)_55%,rgba(15,20,20,0)_80%)]" />
      </span>
      <span className="absolute right-4 bottom-4 left-4 flex flex-col gap-3 md:right-5 md:bottom-5 md:left-5 md:gap-3.5">
        <TitleTreatment
          look={NIGHT_TITLE}
          src={art?.titleTreatmentImage}
          title={series.title}
        />
        <span className="flex min-w-0 flex-col gap-2">
          <span className="flex items-center gap-2.5">
            <span className="inline-flex h-6 min-w-14 shrink-0 items-center justify-center rounded-6 bg-white/10 px-1.5 font-medium text-caption tabular-nums">
              {code}
            </span>
            <span className="min-w-0 truncate font-semibold text-[16px] leading-7">
              <span className="md:hidden">{series.title}</span>
              <span className="max-md:hidden">{line}</span>
            </span>
          </span>
          <MetaRow>
            <MetaItem icon={calendarGlyph}>
              {shortDay(dateMs(night.date))}
            </MetaItem>
            <MetaItem icon={eyeGlyph}>
              {plural(night.episodes, 'episode')}
            </MetaItem>
            <MetaItem icon={clockGlyph}>
              {formatDuration(night.runtimeMinutes)}
            </MetaItem>
          </MetaRow>
        </span>
      </span>
      <CardRim />
    </Link>
  );
}

/** The title treatment, 180 by 28 at the bottom left (desktop); else the name */
// Each place keeps its own look on purpose; don't unify them.
const NIGHT_TITLE: TitleTreatmentLook = {
  height: 28,
  logo: 'h-7 w-[180px] object-contain object-left-bottom max-md:hidden',
  text: 'truncate font-semibold text-title-2 max-md:hidden',
  width: 180,
};

/**
 * The lane's height: padding 36, head 24, the card (at least 230), the two
 * lines (4 + 20 + 10 + 20) and the 16px gaps: 376px. On a phone 32, 24, 16
 * and the 190px card: 262px.
 */
export function BiggestNightSkeleton() {
  return (
    <LaneGhost
      className="h-[370px] max-md:h-[256px] max-md:p-4"
      title="Biggest night"
    >
      <Ghost className="min-h-0 flex-1 rounded-12" />
      <TextLine className="text-meta" width="w-3/4" />
    </LaneGhost>
  );
}
