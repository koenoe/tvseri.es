import Page from '@/components/background/Page';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import cn from '@/lib/cn';

import { getSpotlightColor } from './data/home';
import Guarded from './Guarded';
import { PICK_TITLE } from './moments';
import { TITLE as NEW_THIS_WEEK_TITLE } from './new-this-week/layout';
import { NewThisWeekSkeleton } from './new-this-week/NewThisWeekRow';
import {
  BecauseYouWatchedSection,
  ContinueOrGetStarted,
  MoreGenreSection,
} from './Personal';
import { CONTINUE_WATCHING_TITLE } from './personal/continueLayout';
import { PREMIERES_TITLE, PremieresSkeleton } from './premieres/PremieresRow';
import {
  HIDDEN_GEMS_GLYPH,
  HIDDEN_GEMS_SUBTITLE,
  HIDDEN_GEMS_TITLE,
  HiddenGemsSection,
  NewThisWeekSection,
  PickOneSection,
  PremieresSection,
  SECTION_TITLE,
  SpotlightSection,
  TopPicksSection,
  topPicksTitle,
} from './Sections';
import {
  BecauseYouWatchedSkeleton,
  CONTINUE_RESERVE,
  ContinueSkeleton,
  MoreGenreSkeleton,
  PickSkeleton,
  SIGNED_IN_ROW_CAPTION,
  SpotlightSkeleton,
} from './Skeletons';
import { FeatureSlot, ToySlot } from './Slots';
import spotlightStyles from './spotlight/spotlight.module.css';

/** The ground: the spotlight's colour under the whole page, on the spotlight's own 600ms curve */
const GROUND = cn(
  '-mt-16 bg-[color:var(--home-ground,var(--color-page))] md:-mt-20',
  spotlightStyles.ground,
);

/**
 * Home's page for a day; `/` passes today
 * (`getHomeDay`), the dev preview any day.
 *
 * Home: discovery for everyone. The spotlight, the
 * rows and the day's moments are the same for everyone: `use cache` content
 * prerendered into the static shell and served from the CDN, revalidating on
 * its CACHE_LIFE profile (a section whose API read failed is a streamed hole
 * with its placeholder until the API answers). The signed-in touches stream
 * into Suspense holes (`auth()` only there), with space held for signed-in
 * viewers, and Watched labels arrive on the client.
 *
 * The page colour is the first slide's (the same cached read the spotlight
 * makes), so the server HTML paints the page in it: the header, the footer
 * and everything drawn in the `page` colour have it on the first frame, as
 * the spotlight's ground does.
 */
export default async function HomeView({ day }: Readonly<{ day: string }>) {
  const color = await getSpotlightColor();
  const topPicks = topPicksTitle(day);
  // the placeholders the sections that aren't tile rows stream in with, and
  // fail over (the same node: a failure moves nothing)
  const spotlight = <SpotlightSkeleton />;
  const pick = <PickSkeleton />;
  const newThisWeek = <NewThisWeekSkeleton />;
  const premieres = <PremieresSkeleton />;

  return (
    <Page backgroundColor={color}>
      {/* the ground follows the spotlight's colour (600ms) under the whole page; the footer brings its own air above it */}
      <div className={GROUND} data-home-ground="" data-testid="route-home">
        {/* a failed spotlight leaves the header room above its row error */}
        <div className="[&:has(#spotlight-title)]:pt-16 md:[&:has(#spotlight-title)]:pt-20">
          <Guarded
            fallback={spotlight}
            id="spotlight"
            placeholder={spotlight}
            title={SECTION_TITLE.spotlight}
          >
            <SpotlightSection day={day} placeholder={spotlight} />
          </Guarded>
        </div>
        {/* on a phone the pager sits 28px under the spotlight's buttons: the
            first row's title keeps the same 28px under the pager */}
        <div className="flex flex-col gap-12 pt-7 md:gap-16 md:pt-10">
          <Guarded
            fallback={<ContinueSkeleton />}
            id="continue-watching"
            reserve={CONTINUE_RESERVE}
            title={CONTINUE_WATCHING_TITLE}
          >
            <ContinueOrGetStarted />
          </Guarded>
          <Guarded
            fallback={
              <RowSkeleton
                id="top-picks"
                look="home"
                name="top-picks"
                title={topPicks}
              />
            }
            id="top-picks"
            look="home"
            title={topPicks}
          >
            <TopPicksSection day={day} />
          </Guarded>
          <Guarded
            fallback={pick}
            id="pick-one"
            placeholder={pick}
            title={PICK_TITLE}
          >
            <PickOneSection day={day} placeholder={pick} />
          </Guarded>
          <Guarded
            caption={SIGNED_IN_ROW_CAPTION}
            fallback={<BecauseYouWatchedSkeleton />}
            id="because-you-watched"
            title="Because you watched"
          >
            <BecauseYouWatchedSection day={day} />
          </Guarded>
          <Guarded
            fallback={
              <RowSkeleton
                id="hidden-gems"
                look="home"
                name="hidden-gems"
                subtitle={HIDDEN_GEMS_SUBTITLE}
                subtitleGlyph={HIDDEN_GEMS_GLYPH}
                title={HIDDEN_GEMS_TITLE}
              />
            }
            id="hidden-gems"
            look="home"
            subtitle={HIDDEN_GEMS_SUBTITLE}
            subtitleGlyph={HIDDEN_GEMS_GLYPH}
            title={HIDDEN_GEMS_TITLE}
          >
            <HiddenGemsSection day={day} />
          </Guarded>
          <FeatureSlot day={day} />
          <Guarded
            fallback={newThisWeek}
            id="new-this-week"
            placeholder={newThisWeek}
            title={NEW_THIS_WEEK_TITLE}
          >
            <NewThisWeekSection day={day} placeholder={newThisWeek} />
          </Guarded>
          <Guarded
            fallback={premieres}
            id="premieres"
            placeholder={premieres}
            title={PREMIERES_TITLE}
          >
            <PremieresSection day={day} placeholder={premieres} />
          </Guarded>
          <ToySlot day={day} />
          <Guarded
            caption={SIGNED_IN_ROW_CAPTION}
            fallback={<MoreGenreSkeleton />}
            id="more-genre"
            tiles="backdrop"
            title="More for you"
          >
            <MoreGenreSection day={day} />
          </Guarded>
        </div>
      </div>
    </Page>
  );
}
