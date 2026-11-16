import FailedCard from '@/components/ui/failed/FailedCard';
import type {
  FailedLook,
  TryAgainLook,
} from '@/components/ui/failed/failedLooks';
import { warningGlyph } from '@/components/ui/icon/glyphs';
import RefreshRetry from '@/components/ui/row/RefreshRetry';

import IconDisc from './IconDisc';
import { PROFILE_TRY_AGAIN } from './profileTryAgain';

/**
 * A profile block whose data is unavailable: the disc beside the title and
 * line, Try again under them.
 * Each place keeps its own look on purpose; don't unify them.
 */
const PROFILE_SETTLED: FailedLook = {
  body: 'text-caption text-white/60',
  box: 'grid grid-cols-[auto_minmax(0,1fr)] content-center items-center gap-x-3.5 gap-y-2 bg-black/22 p-[18px]',
  text: 'flex min-w-0 flex-col gap-1',
  title: 'text-body-sm font-semibold',
};

/** Its Try again, under the text */
const SETTLED_TRY_AGAIN: TryAgainLook = {
  ...PROFILE_TRY_AGAIN,
  className: `${PROFILE_TRY_AGAIN.className} col-start-2 justify-self-start`,
};

const tryAgain = <RefreshRetry look={SETTLED_TRY_AGAIN} />;

const warningDisc = <IconDisc glyph={warningGlyph} />;

/**
 * A block whose data is `Unavailable` (an outage): the warning disc, a title and one line, and a Try again that
 * refreshes the route (the failed read is kept only for the short
 * `unavailable` life). `className` is the block's box: the size of what it
 * stands in for, so nothing shifts when it comes back.
 */
export default function BlockUnavailable({
  className,
  line,
  title,
}: Readonly<{ className: string; line: string; title: string }>) {
  return (
    <FailedCard
      action={tryAgain}
      body={line}
      className={className}
      look={PROFILE_SETTLED}
      mark={warningDisc}
      role="status"
      title={title}
    />
  );
}
