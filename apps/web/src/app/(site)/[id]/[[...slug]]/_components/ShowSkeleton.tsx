import { PAGE_MAIN_CLASS } from '@/components/background/Page';
import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import cn from '@/lib/cn';

import { CastSkeleton } from './cast/Cast';
import EpisodesSkeleton from './episodes/EpisodesSkeleton';
import {
  CAST_FRAME,
  CREATED_BY_LINE,
  EPISODES_SECTION,
  RECOMMENDATIONS_FRAME,
} from './frames';
import HeroSkeleton from './hero/HeroSkeleton';
import StorylineSkeleton from './info/StorylineSkeleton';

const CAST_TITLE_GHOST = cn('h-3 w-48 rounded-4', GHOST_FILL, PULSE);
const CREATED_BY_GHOST = cn('flex h-6 items-center', CREATED_BY_LINE);

/**
 * The show page in the App Shell: what a default `<Link>` prefetch carries
 * (the shell is shared by every show, so nothing of the show yet), and what
 * a show's first visit streams from. Every section of the page in order,
 * built from the page's own frames and row/tile layouts at their real sizes
 * (the typical show: a three-line description, six keywords' worth of chips,
 * a season with nothing watched), so the page doesn't change height when
 * the show arrives and nothing below the fold moves.
 */
export default function ShowSkeleton() {
  return (
    <main
      aria-busy="true"
      className={PAGE_MAIN_CLASS}
      data-testid="show-skeleton"
    >
      <div className="relative z-10">
        <div data-placeholder="show">
          <HeroSkeleton />
          <div className={CAST_FRAME} data-placeholder="cast-block">
            <p aria-hidden="true" className={CREATED_BY_GHOST}>
              <span className={CAST_TITLE_GHOST} />
            </p>
            <CastSkeleton />
          </div>
          <section
            aria-hidden="true"
            className={EPISODES_SECTION}
            data-placeholder="episodes-section"
          >
            <EpisodesSkeleton />
          </section>
          <div
            className={RECOMMENDATIONS_FRAME}
            data-placeholder="recommendations"
          >
            <RowSkeleton id="recommendations" title="Recommendations" />
          </div>
          <StorylineSkeleton />
        </div>
      </div>
    </main>
  );
}
