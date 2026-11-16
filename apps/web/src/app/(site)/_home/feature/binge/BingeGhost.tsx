import type { CSSProperties } from 'react';
import {
  ButtonFace,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import {
  playGlyph,
  plusGlyph,
  variantHourglassGlyph,
} from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import {
  ACTION_PAIR,
  ACTION_PAIR_BUTTON,
  ACTION_PAIR_SOLID,
} from '../../actionPair';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { MomentFrame } from '../Moment';
import { BINGE_OPTION, ControlRow } from './BingeControls';
import {
  ADD_LABEL,
  BINGE_CARD,
  BINGE_CHOICE,
  BINGE_CHOICE_COUNT,
  BINGE_CHOICES,
  BINGE_CONTROLS,
  BINGE_FOOTER,
  BINGE_FOOTER_DOT,
  BINGE_FOOTER_SUMMARY,
  BINGE_FOOTER_TEXT,
  BINGE_HEAD,
  BINGE_HEADLINE,
  BINGE_PICKERS,
  BINGE_STRIP,
  BINGE_STRIP_CELL,
  DEFAULT_MODE,
  DEFAULT_PER_NIGHT,
  EACH_NIGHT_LABEL,
  NIGHTS_LABEL,
  START_LABEL,
} from './layout';
import { DOT_SIZE, STRIP_PITCH } from './NightStrip';
import {
  NIGHTS_OPTIONS,
  nightsSummary,
  PER_NIGHT_OPTIONS,
  perNightLabel,
} from './plan';

const CARD = cn(BINGE_CARD, PULSE);

/** The headline's second line: it wraps on a phone only */
const HEADLINE_WRAP = cn(BINGE_HEADLINE, 'md:hidden');

/** A switch's option as a face: the real label, the start's choice lit */
const OPTION = cn(BINGE_OPTION, 'flex items-center justify-center');

const CHOICES = Array.from({ length: BINGE_CHOICE_COUNT }, (_, n) => n);

/** A typical plan's nights, as the strip's dots */
const NIGHTS = 12;
const STRIP_CELLS = Array.from({ length: NIGHTS }, (_, n) => n);
const STRIP = cn(BINGE_STRIP, 'flex-nowrap justify-between');
const STRIP_STYLE = { '--days': NIGHTS, '--p': STRIP_PITCH } as CSSProperties;

const DOT = cn('block rounded-full', DOT_SIZE, GHOST_FILL);

const FINISH_DATE = cn(
  'inline-block h-3 w-20 rounded-4 align-middle',
  GHOST_FILL,
);

const SUMMARY = nightsSummary(DEFAULT_PER_NIGHT, DEFAULT_MODE);

function Controls() {
  const hint = <TextLine className="text-meta" width="w-28" />;
  return (
    <div className={BINGE_CONTROLS}>
      <ControlRow hint={hint} label={EACH_NIGHT_LABEL}>
        {PER_NIGHT_OPTIONS.map((count) => (
          <span
            aria-pressed={count === DEFAULT_PER_NIGHT}
            className={OPTION}
            key={count}
          >
            {perNightLabel(count)}
          </span>
        ))}
      </ControlRow>
      <ControlRow label={NIGHTS_LABEL}>
        {NIGHTS_OPTIONS.map((option) => (
          <span
            aria-pressed={option.mode === DEFAULT_MODE}
            className={OPTION}
            key={option.mode}
          >
            {option.label}
          </span>
        ))}
      </ControlRow>
    </div>
  );
}

/**
 * The Binge calculator's placeholder, frame included: the card with its label
 * (static, real text), the headline's lines, the four posters, the two switches as they start (their labels are
 * static), the night strip's dots, and the foot ("Finished" and the
 * summary, the date a ghost; the two actions).
 */
export default function BingeGhost() {
  return (
    <MomentFrame name="feature" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <div className={BINGE_HEAD}>
            <MomentLabel
              glyph={variantHourglassGlyph}
              title={FEATURE_TITLE.binge}
            />
            <span className="block">
              <TextLine
                bar="h-5"
                className={BINGE_HEADLINE}
                width="w-4/5 md:w-[480px] xl:w-[560px]"
              />
              <TextLine bar="h-5" className={HEADLINE_WRAP} width="w-2/5" />
            </span>
          </div>
          <div className={BINGE_PICKERS}>
            <div className={BINGE_CHOICES}>
              {CHOICES.map((n) => (
                <Ghost className={BINGE_CHOICE} key={n} />
              ))}
            </div>
            <Controls />
          </div>
          <div className={STRIP} style={STRIP_STYLE}>
            {STRIP_CELLS.map((n) => (
              <span className={BINGE_STRIP_CELL} key={n}>
                <i className={DOT} />
              </span>
            ))}
          </div>
          <div className={BINGE_FOOTER}>
            <p className={BINGE_FOOTER_TEXT}>
              <b className="font-semibold text-white">
                Finished <span className={FINISH_DATE} />
              </b>{' '}
              <span className={BINGE_FOOTER_SUMMARY}>
                <span className={BINGE_FOOTER_DOT}>· </span>
                {SUMMARY}
              </span>
            </p>
            <div className={ACTION_PAIR}>
              <ButtonFace
                className={ACTION_PAIR_SOLID}
                icon={playGlyph}
                variant="primary"
              >
                {START_LABEL}
              </ButtonFace>
              <ButtonFace className={ACTION_PAIR_BUTTON} icon={plusGlyph}>
                {ADD_LABEL}
              </ButtonFace>
            </div>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
