import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import SectionHead from '@/components/ui/section/SectionHead';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import SubpageHeader from '../../_components/subpage/SubpageHeader';
import { CIRCLE_COPY, visitorCopy } from '../_lib/circleCopy';
import CircleGhost from './CircleGhost';
import { PAGE, VISITOR_HEAD } from './rowBoxes';

/** A bar's fill, inside a block that pulses */
const BAR_FILL = `inline-block rounded-6 align-middle ${GHOST_FILL}`;
/** A bar on its own */
const BAR = `${BAR_FILL} ${PULSE}`;

/** A handle of a usual length (a generated one is two words and a number) for the visitor line's ghost */
const STAND_IN = 'quiet-heron-5120';

/** The header's count while it loads: "8 following · 6 followers" is about this wide */
const countGhost = <span className={`h-3 w-[150px] ${BAR}`} />;

/** Your own Circle: the title, description and first section are static copy */
const owner = (
  <>
    <SubpageHeader
      className="max-md:hidden"
      count={countGhost}
      description={CIRCLE_COPY.ownerDescription}
      title="Circle"
    />
    <section>
      <SectionHead
        id="circle-following-ph"
        link={<span className={`h-3 w-3 ${BAR}`} />}
        size="side"
        title={CIRCLE_COPY.following}
      />
      <div className="mt-4 md:mt-5">
        <CircleGhost owner />
      </div>
    </section>
  </>
);

/** Someone else's: their name isn't known before the page streams, so ghost lines */
const visitor = (
  <>
    <div
      className={`flex flex-col gap-2 max-md:hidden ${PULSE}`}
      data-placeholder={VISITOR_HEAD}
    >
      <div className="flex h-8 items-center">
        <span className={`h-7 w-[120px] ${BAR_FILL}`} />
      </div>
      {/* the line itself in ghost bars, with a name of a usual length, so
          it wraps where theirs will at 800 and 1100px */}
      <div className="text-meta text-transparent">
        <span
          className={`rounded-6 [box-decoration-break:clone] ${GHOST_FILL}`}
        >
          {visitorCopy(STAND_IN).description}
        </span>
      </div>
    </div>
    <section>
      <div className="flex h-6 items-center">
        <span className={`h-[18px] w-[120px] ${BAR}`} />
      </div>
      <div className="mt-4">
        <CircleGhost owner={false} />
      </div>
    </section>
  </>
);

/**
 * The Circle before it streams: the header and five ghost
 * rows in the real boxes, yours or someone else's before the first paint.
 */
export default function CircleSkeleton() {
  return (
    <div aria-hidden="true" className={PAGE} data-placeholder="circle">
      <OwnerVisitor owner={owner} visitor={visitor} />
    </div>
  );
}
