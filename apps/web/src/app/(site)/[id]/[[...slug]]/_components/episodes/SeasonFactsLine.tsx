import { memo } from 'react';

import { PULSE } from '@/components/ui/ghost/ghosts';
import {
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  seasonGlyph,
  skippedGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import type { SeasonFacts } from './facts';

/** The facts' row: one line, wrapping whole on a phone (its ghost takes the same) */
const FACTS_ROW = 'gap-3 max-md:flex-wrap max-md:gap-y-1 md:gap-4';

/** A fact's ghost: the icon's square and the words' box, the words unseen */
const GHOST_ICON = `size-[13px] shrink-0 rounded-2 ${GHOST_FILL}`;
const GHOST_TEXT = `rounded-4 ${GHOST_FILL} text-transparent`;
const GHOST_ROW = cn(FACTS_ROW, PULSE);

/**
 * The season facts in the meta style: date · count · time left, or
 * the eye + "Watched", or the pink next day / year, then "1 skipped" with
 * its glyph (a fact like the others, not a loose word after the line). One
 * calm line; on a phone the facts wrap whole to a second line rather than
 * run off the screen.
 */
const SeasonFactsLine = memo(function SeasonFactsLine({
  facts,
}: Readonly<{ facts: SeasonFacts }>) {
  const { last } = facts;
  return (
    <MetaRow className={FACTS_ROW}>
      <MetaItem icon={calendarGlyph}>{facts.date}</MetaItem>
      <MetaItem icon={seasonGlyph}>{facts.count}</MetaItem>
      {last?.kind === 'eye' ? (
        <MetaItem active className="[&>svg]:text-white/70" icon={eyeGlyph}>
          {last.text}
        </MetaItem>
      ) : last ? (
        <MetaItem icon={clockGlyph} title={last.text}>
          {last.kind === 'pink' ? (
            <span className="text-pink">{last.text}</span>
          ) : (
            last.text
          )}
        </MetaItem>
      ) : null}
      <MetaItem icon={skippedGlyph}>{facts.skipped}</MetaItem>
    </MetaRow>
  );
});
SeasonFactsLine.displayName = 'SeasonFactsLine';

export default SeasonFactsLine;

/**
 * The facts while the season's episodes load (`seasonFactsEstimate`): each
 * fact a flat ghost the width of its words, in the facts' own row, so it
 * wraps where the real line will and the header doesn't grow when it lands.
 */
export function SeasonFactsGhost({ facts }: Readonly<{ facts: SeasonFacts }>) {
  const texts = [facts.date, facts.count, facts.last?.text, facts.skipped];
  return (
    <MetaRow
      aria-hidden="true"
      className={GHOST_ROW}
      data-placeholder="season-facts"
    >
      {texts.map((text, index) =>
        text ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5"
            key={index}
          >
            <span className={GHOST_ICON} />
            <span className={GHOST_TEXT}>{text}</span>
          </span>
        ) : null,
      )}
    </MetaRow>
  );
}
