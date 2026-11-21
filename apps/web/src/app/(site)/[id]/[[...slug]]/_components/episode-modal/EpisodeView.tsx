'use client';

import { compareEpisodes, type EpisodeRef } from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { type CSSProperties, type RefObject, useMemo, useState } from 'react';
import PageSlide from '@/components/motion/PageSlide';
import { PICTURE_SURFACE_LG } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';
import { codeOf } from '@/lib/marking/progress';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import type { ShowSummary } from '../../_lib/show';
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

/**
 * A slow 6% Ken Burns push once the modal has settled. A step to another
 * episode cross-fades the new still in over the old one (the old fades
 * out), as its words slide in (`PageSlide`); the first still is just there.
 */
const KEN_BURNS = {
  animate: { opacity: 1, scale: 1.06 },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  transition: {
    opacity: { duration: 0.28, ease: 'easeOut' },
    scale: { delay: 0.6, duration: 16, ease: 'easeOut' },
  },
} as const;
const FIRST_STILL = { opacity: 1, scale: 1 } as const;
const STEPPED_STILL = { opacity: 0, scale: 1 } as const;

/**
 * Which way the last step went (1 on, -1 back) and whether there was one:
 * read from the episodes' order, so the ‹ › buttons and ←/→ agree
 */
function useStepDirection(episode: EpisodeRef) {
  const [seen, setSeen] = useState({ direction: 1, episode, stepped: false });
  if (compareEpisodes(episode, seen.episode) !== 0) {
    setSeen({
      direction: compareEpisodes(episode, seen.episode) > 0 ? 1 : -1,
      episode,
      stepped: true,
    });
  }
  return seen;
}

/** The episode's words and faces: the column's own spacing, one page */
const WORDS = 'flex w-full flex-col items-start gap-4 max-lg:gap-2.5';

/** The content fades in after the grow. */
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
 * the side-by-side face doesn't fit (the roll keeps 300px, so the title
 * column would shrink to ~190px and its 104px title rise out of the panel's
 * top, out of scroll reach), so tablets take the stacked face too, inside the centred
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
  const airDate = details?.airDate ?? '';
  const loading = season === undefined;
  const runtime = details?.runtime ?? 0;
  const { direction, stepped } = useStepDirection(episode);
  const stillFrom = stepped ? STEPPED_STILL : FIRST_STILL;

  return (
    <div
      className="relative flex min-h-full flex-col max-lg:pb-8 max-sm:pb-[120px]"
      ref={contentRef}
    >
      {/* the still and its dim: one layer from lg, where the panel's
          rounded corners clip it (`PICTURE_SURFACE_LG`) */}
      <div className={STILL_LAYER}>
        <AnimatePresence>
          {details ? (
            <m.div
              className="absolute inset-0"
              initial={stillFrom}
              key={code}
              {...KEN_BURNS}
            >
              <Still
                loading="eager"
                sizes="(max-width: 639px) 100vw, 1320px"
                src={details.stillImage}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
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
          {/* a step slides the episode's words the way you went, as the
              calendar's months do; the stub with the arrows stays put */}
          <PageSlide className={WORDS} direction={direction} pageKey={code}>
            <EpisodeFacts
              airDate={airDate}
              episode={episode}
              loading={loading}
              logo={show.logo}
              runtime={runtime}
              seasons={show.seasons}
              seriesId={show.id}
              showTitle={show.title}
              title={title}
            />
            <EpisodeCast episode={episode} part="faces" seriesId={show.id} />
          </PageSlide>
          {/* one element at every width: under the faces, docked to the
              screen's foot on a phone by its own `max-sm:fixed` */}
          <RecordStub
            airDate={airDate}
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
