'use client';

import type { VersusSide } from '@tvseri.es/schemas';
import WatchlistToggle from '@/components/marking/WatchlistToggle';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import showPath from '@/lib/routing/showPath';

import {
  ACTION_PAIR,
  ACTION_PAIR_BUTTON,
  ACTION_PAIR_SOLID,
} from '../../actionPair';
import { VERSUS_HINT } from './copy';
import { VERSUS_RESULT } from './layout';

/**
 * "Open {series}" and the watchlist toggle for the chosen series, side by
 * side (the Home action pair). Versus only shows series in none of the
 * viewer's lists, so the toggle opens at "+ Watchlist" with no read: only
 * its own press changes it (the toast and Undo; the sign-in prompt when
 * signed out).
 */
function Actions({ series }: Readonly<{ series: VersusSide }>) {
  const href = showPath(series.id, series.slug);
  return (
    <span className={ACTION_PAIR}>
      <ButtonLink
        className={ACTION_PAIR_SOLID}
        href={href}
        icon={arrowRightGlyph}
        size="sm"
        variant="primary"
      >
        {`Open ${series.title}`}
      </ButtonLink>
      <WatchlistToggle
        className={ACTION_PAIR_BUTTON}
        id={series.id}
        title={series.title}
      />
    </span>
  );
}

/**
 * Under the comparison (HMFinal `e2-vres`): "Tap the one you would start",
 * then the chosen series' actions in the same 48px row, so the swap moves
 * nothing.
 */
export default function VersusResult({
  chosen,
}: Readonly<{ chosen: VersusSide | null }>) {
  return (
    <div className={VERSUS_RESULT}>
      {chosen ? (
        <Actions key={chosen.id} series={chosen} />
      ) : (
        <span>{VERSUS_HINT}</span>
      )}
    </div>
  );
}
