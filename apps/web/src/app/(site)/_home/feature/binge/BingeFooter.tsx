import WatchlistToggle from '@/components/marking/WatchlistToggle';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { playGlyph } from '@/components/ui/icon/glyphs';
import showPath from '@/lib/routing/showPath';
import {
  ACTION_PAIR,
  ACTION_PAIR_SOLID,
  ACTION_PAIR_TOGGLE,
} from '../../actionPair';
import type { BingeChoice } from './choices';
import {
  ADD_LABEL,
  BINGE_FOOTER,
  BINGE_FOOTER_DOT,
  BINGE_FOOTER_SUMMARY,
  BINGE_FOOTER_TEXT,
  START_LABEL,
} from './layout';

/**
 * "Finished Mon Nov 23 · 2 episodes a night", then Start watching (opens the
 * show) and the watchlist toggle, "Add to watchlist"
 * (no read: only its own press changes it).
 */
export default function BingeFooter({
  choice,
  dated,
  finish,
  summary,
}: Readonly<{
  choice: BingeChoice;
  /** false until the viewer's day is known: the date keeps its place */
  dated: boolean;
  finish: string;
  summary: string;
}>) {
  const href = showPath(choice.id, choice.slug);
  return (
    <div className={BINGE_FOOTER}>
      <p className={BINGE_FOOTER_TEXT}>
        <b className="font-semibold text-white">
          Finished{' '}
          <span className={dated ? undefined : 'invisible'}>{finish}</span>
        </b>{' '}
        <span className={BINGE_FOOTER_SUMMARY}>
          <span className={BINGE_FOOTER_DOT}>· </span>
          {summary}
        </span>
      </p>
      <div className={ACTION_PAIR}>
        <ButtonLink
          className={ACTION_PAIR_SOLID}
          href={href}
          icon={playGlyph}
          size="sm"
          variant="primary"
        >
          {START_LABEL}
        </ButtonLink>
        <WatchlistToggle
          className={ACTION_PAIR_TOGGLE}
          id={choice.id}
          label={ADD_LABEL}
          title={choice.title}
        />
      </div>
    </div>
  );
}
