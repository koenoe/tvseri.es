import { Ghost, Line } from '@/components/ui/ghost/ghosts';
import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  INFORMATION_GRID,
  LOWER_BAND,
  LOWER_BAND_INNER,
  STORYLINE_BOX,
  STORYLINE_GRID,
} from '../frames';
import { KeywordsSkeleton } from './Keywords';

/** The description's box as a flat ghost (no surface of its own), one pulse. */
const STORYLINE_GHOST = cn(STORYLINE_BOX, GHOST_LOOK.loading);

const INFORMATION_GHOST = cn(INFORMATION_GRID, 'animate-ghost');

/** One ghost line of body text (28px) at the given width. */
function BodyLine({ width }: Readonly<{ width: string }>) {
  return <Line className="h-7" width={width} />;
}

/** One fact of the Information block: its label and its value (52px), or its network logo (68px). */
function Fact({ logo, value }: Readonly<{ logo?: boolean; value: string }>) {
  const logoBox = cn('h-8 rounded-4', value);
  return (
    <div className={logo ? 'flex flex-col gap-3' : 'flex flex-col gap-1'}>
      <Line className="h-6" width="w-20" />
      {logo ? (
        <Ghost className={logoBox} />
      ) : (
        <Line className="h-6" width={value} />
      )}
    </div>
  );
}

/**
 * The lower band for a show that is not known yet: the real headings, the
 * description box with three lines (nine on a phone, ten below 375, where it is narrow),
 * the keywords' ghosts and the Information block's three columns.
 */
export default function StorylineSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={LOWER_BAND}
      data-placeholder="lower-band"
    >
      <div className={LOWER_BAND_INNER}>
        <h2 className="mb-6 text-title-2">Storyline</h2>
        <div className={STORYLINE_GRID} data-placeholder="storyline-grid">
          <div className={STORYLINE_GHOST}>
            <BodyLine width="w-full" />
            <BodyLine width="w-full" />
            <BodyLine width="w-3/4" />
            <span className="md:hidden">
              <BodyLine width="w-full" />
              <BodyLine width="w-full" />
              <BodyLine width="w-full" />
              <BodyLine width="w-full" />
              <BodyLine width="w-full" />
              <BodyLine width="w-2/3" />
            </span>
            {/* the median description takes one line more in a small phone's column (296px at 360) */}
            <span className="min-[375px]:hidden">
              <BodyLine width="w-1/2" />
            </span>
          </div>
          <KeywordsSkeleton />
        </div>
        <h2 className="mb-6 text-title-2">Information</h2>
        <div className={INFORMATION_GHOST} data-placeholder="information">
          <div className="flex flex-col gap-6">
            <Fact value="w-40" />
            <Fact value="w-24" />
            <Fact value="w-16" />
            <Fact value="w-48" />
          </div>
          <div className="flex flex-col gap-6">
            <Fact value="w-28" />
            <Fact value="w-36" />
            <Fact value="w-32" />
          </div>
          <div className="flex flex-col gap-6">
            <Fact logo value="w-24" />
            <Fact value="w-44" />
          </div>
        </div>
      </div>
    </section>
  );
}
