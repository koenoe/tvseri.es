import Image from 'next/image';
import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import {
  calendarGlyph,
  clockGlyph,
  historyGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import SectionHead from '@/components/ui/section/SectionHead';
import CardRim from '@/components/ui/tile/CardRim';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';

import { getSpotlight, isUnavailable } from '../../_data/loaders';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import { type SpotlightCard, spotlightCard } from './model';
import { FIRST_LAST_TITLE } from './statsTitle';

const FADE =
  'bg-[linear-gradient(0deg,rgba(22,27,29,1)_0%,rgba(22,27,29,0.5)_45%,rgba(22,27,29,0)_80%)]';
const GLASS =
  'bg-white/5 backdrop-blur-[12px] shadow-[inset_0_7px_14px_0_rgb(255_255_255/0.03),inset_0_0.5px_0.5px_0_rgb(255_255_255/0.06),inset_0_0.25px_0.25px_0_rgb(255_255_255/0.12),0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)]';

/**
 * One backdrop card (`First watch` / `Last watch`): the backdrop under a fade,
 * the title treatment, the episode badge and title, "Sat Jan 4" and the
 * runtime. The whole card links to the show.
 */
function SpotlightArticle({
  card,
  label,
}: Readonly<{ card: SpotlightCard; label: string }>) {
  return (
    <article className="relative h-[210px] overflow-hidden rounded-12 shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)] md:h-[300px]">
      <TileLink
        aria-label={card.label}
        className="absolute inset-0 flex items-end"
        href={card.href}
      >
        {/* the backdrop and its fade: one layer, clipped once by the corners */}
        <span aria-hidden className={PICTURE_LAYER}>
          {card.backdrop ? (
            <Image
              alt=""
              className="object-cover object-[center_30%]"
              fill
              loading="lazy"
              sizes="(min-width: 768px) 50vw, 100vw"
              src={card.backdrop}
            />
          ) : null}
          <span className={`absolute inset-0 opacity-80 ${FADE}`} />
        </span>
        <span className="relative flex w-full flex-col gap-[18px] p-7">
          <TitleTreatment
            look={FIRST_LAST_TITLE}
            src={card.logo}
            title={card.title}
          />
          <span className="flex min-w-0 flex-col gap-2">
            <span className="flex min-w-0 items-center gap-3 whitespace-nowrap">
              <span className="inline-flex h-6 min-w-[54px] shrink-0 items-center justify-center rounded-6 bg-white/10 px-1.5 font-medium text-caption tabular-nums">
                {card.code}
              </span>
              <span className="truncate font-semibold text-body">
                {card.episodeTitle}
              </span>
            </span>
            <MetaRow>
              <MetaItem icon={calendarGlyph}>{card.date}</MetaItem>
              <MetaItem icon={clockGlyph}>{card.duration}</MetaItem>
            </MetaRow>
          </span>
        </span>
      </TileLink>
      <CardRim />
      <span
        className={`absolute top-4 left-4 z-3 flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium text-caption text-white/80 ${GLASS}`}
      >
        <Icon glyph={historyGlyph} size={13} />
        {label}
      </span>
    </article>
  );
}

/** "First and last": how the year opened and closed, from `getSpotlight` */
export default async function FirstAndLast({ user, year }: SectionProps) {
  const spotlight = await getSpotlight(user.id, year);
  if (isUnavailable(spotlight)) {
    return (
      <StatsUnavailable
        id="stats-first-last"
        placeholder={<FirstAndLastSkeleton />}
        title={'First and last'}
      />
    );
  }
  if (!spotlight.first && !spotlight.last) {
    return null;
  }
  const first = spotlight.first ? spotlightCard(spotlight.first) : null;
  const last = spotlight.last ? spotlightCard(spotlight.last) : null;
  return (
    <section
      aria-labelledby="first-last-title"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead id="first-last-title" title="First and last" />
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-stretch md:gap-5">
        {first ? <SpotlightArticle card={first} label="First watch" /> : null}
        {last ? <SpotlightArticle card={last} label="Last watch" /> : null}
      </div>
    </section>
  );
}

/** Two cards of 300px side by side; on a phone two of 210px, 24px apart */
/** One card while it streams: the flat panel, the chip, the logo's box, the episode and date lines */
function FirstLastCardGhost() {
  return (
    <div className={CARD_GHOST}>
      <Ghost className="h-6 w-24 rounded-full" />
      <span className="flex flex-col gap-3">
        <Ghost className="h-10 w-48 max-w-full rounded-8" />
        <TextLine className="text-body-sm" width="w-40" />
        <TextLine className="text-meta" width="w-32" />
      </span>
    </div>
  );
}

const CARD_GHOST = cn(
  'flex h-[210px] flex-col justify-between rounded-12 bg-black/22 p-5 md:h-[300px]',
  PULSE,
);

export function FirstAndLastSkeleton() {
  return (
    <section
      aria-busy
      aria-label="First and last"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead id="first-last-skeleton" title="First and last" />
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-5">
        <FirstLastCardGhost />
        <FirstLastCardGhost />
      </div>
    </section>
  );
}
