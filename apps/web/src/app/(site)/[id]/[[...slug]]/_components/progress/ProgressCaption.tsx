import type { ReactNode } from 'react';

import RollingNumber from '@/components/motion/RollingNumber';

import {
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  skippedGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import type { LinePart, ProgressLine } from './progressLine';

/**
 * The progress line's words, one place for their spacing: 6px either side
 * of each "·", 4px from an icon to its text.
 */
const SEPARATOR = 'mx-1.5';
const ICON_GAP = 'gap-1';

const TEXT = 'text-caption font-medium text-white/60 tabular-nums';

/**
 * The facts stay on one line. Each after the first carries its "·" before
 * it and the row is one line tall and clipped, so a fact that doesn't fit
 * wraps out of sight with its "·", from the end: the airing "next Fri
 * Nov 20" goes first; the counts and the time left come before it.
 */
const FACTS = cn('flex h-5 min-w-0 flex-wrap overflow-hidden', TEXT);
const ITEM = 'whitespace-nowrap';
/**
 * Wide, the first fact follows the % ("76% · 312 watched"); under the bar
 * on a phone it starts its own line, so its "·" goes
 */
const FIRST_SEPARATOR = cn(SEPARATOR, '@max-md:hidden');

/** The watch-history chips' glyph look: one size, one stroke, 65% */
const GLYPH = 'shrink-0 opacity-65';

/** Each fact's small line icon, on the line with skips */
const PART_ICON: Readonly<Record<LinePart['kind'], ReactNode>> = {
  count: null,
  left: (
    <Icon className={GLYPH} glyph={clockGlyph} size={11} strokeWidth={2.2} />
  ),
  next: (
    <Icon className={GLYPH} glyph={calendarGlyph} size={11} strokeWidth={2.2} />
  ),
  skipped: (
    <Icon className={GLYPH} glyph={skippedGlyph} size={11} strokeWidth={2.2} />
  ),
  toWatch: null,
  watched: (
    <Icon
      active
      className={GLYPH}
      glyph={eyeGlyph}
      size={11}
      strokeWidth={2.2}
    />
  ),
};

const WITH_ICON = cn('inline-flex items-center align-[-1px]', ICON_GAP);

/** A fact and the "·" before it (`separator`: its class; none for a lead) */
function Fact({
  children,
  separator,
}: Readonly<{ children: ReactNode; separator: string | null }>) {
  return (
    <span className={ITEM} data-fact>
      {separator === null ? null : <span className={separator}>·</span>}
      {children}
    </span>
  );
}

function PartText({ part }: Readonly<{ part: LinePart }>) {
  if (!part.icon) {
    return part.text;
  }
  return (
    <span className={WITH_ICON}>
      {PART_ICON[part.kind]}
      <span>{part.text}</span>
    </span>
  );
}

const PERCENT = cn('whitespace-nowrap', TEXT, 'font-medium text-white/80');

/*
 * The line's words are hidden from assistive tech: each place carries
 * `line.label`, the same facts in words ("46 hours" for "46h").
 */

/** The finish's roll: from the share before it, to 100 (keyed, plays once) */
export type PercentRoll = Readonly<{ key: number; from: number }>;

/** "76%"; with `roll`, the digits roll up to "100%" */
export function LinePercent({
  line,
  roll,
}: Readonly<{ line: ProgressLine; roll?: PercentRoll | null }>) {
  return (
    <b aria-hidden="true" className={PERCENT}>
      {roll ? (
        <>
          <RollingNumber from={roll.from} key={roll.key} value={line.share} />%
        </>
      ) : (
        line.percent
      )}
    </b>
  );
}

/** "312 watched · 68 skipped · 46h left", the same words at every width */
export function LineFacts({ line }: Readonly<{ line: ProgressLine }>) {
  return (
    <span aria-hidden="true" className={FACTS}>
      {line.parts.map((part, index) => (
        <Fact
          key={part.kind}
          separator={index === 0 ? FIRST_SEPARATOR : SEPARATOR}
        >
          <PartText part={part} />
        </Fact>
      ))}
    </span>
  );
}

/**
 * Signed out, the series' size in the line's place ("47 episodes · 26h 51m
 * in all"); the button's label says it too.
 */
export function SizeFacts({
  facts,
}: Readonly<{ facts: ReadonlyArray<string> }>) {
  return (
    <span aria-hidden="true" className={FACTS}>
      {facts.map((fact, index) => (
        <Fact key={fact} separator={index === 0 ? null : SEPARATOR}>
          {fact}
        </Fact>
      ))}
    </span>
  );
}
