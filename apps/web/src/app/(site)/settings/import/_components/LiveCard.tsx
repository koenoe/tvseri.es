import type { CSSProperties } from 'react';
import { infoGlyph, showGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { formatGrouped } from '@/lib/formatCount';

import { OUTCOME_RGB, outcomeOf } from '../_lib/outcome';
import Ripple from './Ripple';
import { META_ITEM, META_ROW } from './styles';

/**
 * The import while it runs: a live counter ("917 items imported out of 1,877") over the Ripple, the 4px
 * line, the show being imported and "98% matched so far" with a dot that
 * settles into the outcome's colour. Stopped, it keeps the number and line.
 */
export default function LiveCard({
  current,
  imported,
  progress,
  rate,
  stopped,
  total,
}: Readonly<{
  current: string | null;
  imported: number;
  /** 0 to 1 */
  progress: number;
  /** 0 to 1: of the rows answered, how many came in */
  rate: number;
  stopped: boolean;
  total: number;
}>) {
  const fill = { transform: `scaleX(${progress})` } as CSSProperties;
  const dot = { backgroundColor: `rgb(${OUTCOME_RGB[outcomeOf(rate)]})` };
  const matched = `${Math.round(rate * 100)}% matched so far`;
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-4 overflow-hidden rounded-[24px] bg-white/3 px-8 pb-8 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] [mask-image:linear-gradient(#000_70%,rgb(0_0_0/0.85))] max-md:px-6 max-md:pb-6',
        stopped ? 'pt-9' : 'pt-12',
      )}
    >
      {stopped ? null : <Ripple className="top-1/2" mode="breathe" />}
      <div
        aria-live="polite"
        className="relative flex flex-col items-center gap-2 text-center"
      >
        <span className="text-overline uppercase text-white/60">
          {stopped ? 'Stopped' : 'Importing'}
        </span>
        <b className="text-numeral-xl tabular-nums">
          {formatGrouped(imported)}
        </b>
        <span className="text-body text-white/80">{`items imported out of ${formatGrouped(total)}`}</span>
      </div>
      <span className="relative block h-1 w-full max-w-130 overflow-hidden rounded-2 bg-white/12">
        <i
          className="absolute inset-0 origin-left rounded-2 bg-white transition-transform duration-300 ease-out"
          style={fill}
        />
      </span>
      {stopped ? null : (
        <span className={cn(META_ROW, 'relative justify-center text-white/60')}>
          {current ? (
            <span className={META_ITEM}>
              <Icon glyph={showGlyph} size={13} />
              {`Now: ${current}`}
            </span>
          ) : null}
          <span className={META_ITEM}>
            <i
              className="block size-2 rounded-full transition-[background-color,color] duration-600"
              style={dot}
            />
            {matched}
          </span>
          <span className={META_ITEM}>
            <Icon glyph={infoGlyph} size={13} />
            Keep this page open
          </span>
        </span>
      )}
    </div>
  );
}
