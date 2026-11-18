import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { ACCORDION, SLICE } from './sliceLayout';

const ROW = cn(ACCORDION, PULSE);
const SLICE_GHOST = cn(SLICE, 'rounded-12', GHOST_FILL);

/**
 * The accordion while its slices stream: the slices in their boxes, the
 * first open, as one pulsing layer; the open slice carries its logo and
 * facts line as ghosts where they land (bottom left).
 */
export default function SliceAccordionGhost({
  slices,
}: Readonly<{ slices: number }>) {
  return (
    <div aria-hidden="true" className={ROW}>
      {Array.from({ length: slices }, (_, index) => {
        const first = index === 0;
        return (
          <div className={SLICE_GHOST} data-open={first} key={index}>
            {first ? (
              <span className="absolute right-4 bottom-5 left-4 flex flex-col gap-[18px] xl:right-auto xl:bottom-[26px] xl:left-6 xl:w-[440px]">
                <Ghost className="h-16 w-56 max-w-full rounded-8" />
                <TextLine className="text-meta" width="w-48" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
