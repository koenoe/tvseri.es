'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import * as m from 'motion/react-m';
import { type CSSProperties, type RefObject, useMemo } from 'react';
import { PICTURE_SURFACE_LG } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';
import { codeOf } from '@/lib/marking/progress';

import type { ShowSummary } from '../../_lib/show';
import useSeasonEpisodes from '../../_lib/useSeasonEpisodes';
import Still from '../episodes/Still';
import EpisodeCast from './EpisodeCast';
import EpisodeFacts from './EpisodeFacts';
import { stepEpisode } from './episodeSteps';
import RecordStub from './RecordStub';

/** The still's darkening, tinted by the page. */
const DIM = 'color-mix(in srgb, var(--color-page) 60%, black)';
const dim = (alpha: number) =>
  `color-mix(in srgb, ${DIM} ${alpha}%, transparent)`;
const DIM_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(0deg, ${dim(90)} 0%, transparent 45%), linear-gradient(90deg, ${dim(96)} 0%, ${dim(82)} 34%, ${dim(25)} 58%, ${dim(70)} 78%, ${dim(92)} 100%)`,
};
/** Phones: the still fades into the panel. */
const PHONE_FADE: CSSProperties = {
  backgroundImage:
    'linear-gradient(0deg, color-mix(in srgb, var(--color-page) 70%, black), transparent)',
};

/**
 * The still and its dim behind the content; on a phone the still's 300px
 * band at the top, fading into the panel
 */
const STILL_LAYER = cn(
  'absolute inset-0 overflow-hidden max-lg:relative max-lg:h-[300px] max-lg:shrink-0',
  PICTURE_SURFACE_LG,
);

/** A slow 6% Ken Burns push once the modal has settled. */
const KEN_BURNS = {
  animate: { scale: 1.06 },
  initial: { scale: 1 },
  transition: { delay: 0.6, duration: 16, ease: 'easeOut' },
} as const;

/** The content fades in after the grow (v2-fade .35s ease .28s). */
const FADE_IN = {
  animate: { opacity: 1 },
  initial: { opacity: 0 },
  transition: { delay: 0.28, duration: 0.35, ease: 'easeOut' },
} as const;

type Props = Readonly<{
  contentRef: RefObject<HTMLDivElement | null>;
  episode: EpisodeRef;
  show: ShowSummary;
  onStep: (direction: -1 | 1) => void;
}>;

/**
 * The face: the still fills the modal, the title lands at 104px over the
 * faces and the record stub on the left, the credits roll on the right.
 * Phones stack it: still, title, faces, credits, then the stub. Below `lg`
 * the side-by-side face doesn't fit (the roll keeps 300px, the title column
 * shrank to ~190px and its 104px title rose out of the panel's top, out of
 * scroll reach), so tablets take the stacked face too, inside the centred
 * panel, scrolling; the stub stays under the faces there (the fixed bar is
 * the phone sheet's: the same element, placed by CSS, so crossing 640px
 * never remounts it). Side by side, the column sits at the bottom with
 * `mt-auto`, not `bottom: 0`: in a short window it grows down from the top
 * and scrolls, instead of rising out of the panel.
 */
export default function EpisodeView({
  contentRef,
  episode,
  onStep,
  show,
}: Props) {
  const season = useSeasonEpisodes(show.id, episode.seasonNumber);
  const details = season?.episodes.find(
    (item) => item.episodeNumber === episode.episodeNumber,
  );
  const hasPrev = useMemo(
    () => stepEpisode(show.seasons, episode, -1) !== null,
    [episode, show.seasons],
  );
  const hasNext = useMemo(
    () => stepEpisode(show.seasons, episode, 1) !== null,
    [episode, show.seasons],
  );
  const title = details?.title || `Episode ${episode.episodeNumber}`;
  const code = codeOf(episode);

  return (
    <div
      className="relative flex min-h-full flex-col max-lg:pb-8 max-sm:pb-[120px]"
      ref={contentRef}
    >
      {/* the still and its dim: one layer from lg, where the panel's
          rounded corners clip it (`PICTURE_SURFACE_LG`) */}
      <div className={STILL_LAYER}>
        {details ? (
          <m.div className="size-full" key={code} {...KEN_BURNS}>
            <Still
              loading="eager"
              sizes="(max-width: 639px) 100vw, 1320px"
              src={details.stillImage}
            />
          </m.div>
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-0 max-lg:hidden"
          style={DIM_STYLE}
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[180px] lg:hidden"
          style={PHONE_FADE}
        />
      </div>
      <m.div
        className="relative flex flex-1 flex-col pt-16 max-lg:static max-lg:pt-0"
        {...FADE_IN}
      >
        <div className="relative mt-auto mb-11 ml-16 flex w-[min(740px,calc(100%-560px))] flex-col items-start gap-4 max-lg:mb-0 max-lg:ml-0 max-lg:-mt-[100px] max-lg:w-auto max-lg:gap-2.5 max-lg:px-5">
          <EpisodeFacts
            airDate={details?.airDate ?? ''}
            episode={episode}
            loading={season === undefined}
            logo={show.logo}
            runtime={details?.runtime ?? 0}
            seasons={show.seasons}
            seriesId={show.id}
            showTitle={show.title}
            title={title}
          />
          <EpisodeCast episode={episode} part="faces" seriesId={show.id} />
          {/* one element at every width: under the faces, docked to the
              screen's foot on a phone by its own `max-sm:fixed` */}
          <RecordStub
            airDate={details?.airDate ?? ''}
            episode={episode}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onStep={onStep}
            seriesId={show.id}
            title={title}
          />
        </div>
        <EpisodeCast episode={episode} part="roll" seriesId={show.id} />
      </m.div>
    </div>
  );
}
