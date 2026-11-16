import type { TvSeries } from '@tvseri.es/schemas';
import { Suspense } from 'react';

import { ActionButtonsSkeleton } from '../actions/ActionButtons';
import ActionsHole from '../actions/ActionsHole';
import FirstTrackingPrompt from '../first-tracking/FirstTrackingPrompt';
import { ProgressSkeleton } from '../progress/ProgressBar';
import ProgressHole from '../progress/ProgressHole';
import RatingAndProvider, {
  RatingAndProviderSkeleton,
} from '../where-to-watch/RatingAndProvider';
import HeroGrid from './HeroGrid';
import HeroMeta from './HeroMeta';
import HeroTitle from './HeroTitle';
import {
  HERO_ACTIONS_ROW,
  HERO_DESCRIPTION,
  HERO_META_ROW,
  HERO_PROMPT_SLOT,
  HERO_RATING_CELL,
  HERO_SPACER,
  HERO_TITLE_GROUP,
} from './heroLayout';
import ImdbRating, { ImdbRatingSkeleton } from './ImdbRating';
import PhoneBackdrop from './PhoneBackdrop';

type Props = Readonly<{ series: TvSeries }>;

/**
 * The hero (ep0-hero, fm-hero): title treatment,
 * facts, the age rating and provider logo, the progress line, the
 * first-tracking prompt (static shell content, hidden by a pre-paint hint
 * where it isn't for the viewer), the
 * description (desktop) and the rating with the actions. Each viewer hole
 * renders once; a grid places it. Rows 1 and 2 share a fixed-height spacer
 * (457 + 48px on desktop, 376px on phones), the facts sit bottom-aligned in
 * row 1, so the page below never moves. Desktop: the prompt closes the block,
 * then the description, then the actions. Phone: the actions close the block
 * and the prompt follows it. The cached shell draws what is the same for
 * every viewer; the viewer's parts are Suspense holes whose skeletons hold
 * their space.
 */
export default function Hero({ series }: Props) {
  return (
    <HeroGrid seriesId={series.id}>
      <PhoneBackdrop />
      <div aria-hidden="true" className={HERO_SPACER} />
      <div className={HERO_TITLE_GROUP}>
        <HeroTitle
          logo={series.titleTreatmentImage}
          seriesId={series.id}
          title={series.title}
        />
        <div className={HERO_META_ROW}>
          <HeroMeta series={series}>
            <Suspense fallback={<RatingAndProviderSkeleton />}>
              <RatingAndProvider seriesId={series.id} />
            </Suspense>
          </HeroMeta>
        </div>
        <Suspense fallback={<ProgressSkeleton />}>
          <ProgressHole series={series} />
        </Suspense>
      </div>
      <div className={HERO_PROMPT_SLOT} data-slot="first-tracking">
        {/* Shell content for everyone; nobody has seen a show before it airs */}
        {series.hasAired ? (
          <FirstTrackingPrompt seriesId={series.id} title={series.title} />
        ) : null}
      </div>
      {series.description ? (
        <p className={HERO_DESCRIPTION}>{series.description}</p>
      ) : null}
      <div className={HERO_ACTIONS_ROW}>
        <div className={HERO_RATING_CELL}>
          <Suspense fallback={<ImdbRatingSkeleton />}>
            <ImdbRating
              imdbId={series.externalIds?.imdbId ?? null}
              seriesId={series.id}
            />
          </Suspense>
        </div>
        <Suspense fallback={<ActionButtonsSkeleton />}>
          <ActionsHole series={series} />
        </Suspense>
      </div>
    </HeroGrid>
  );
}
