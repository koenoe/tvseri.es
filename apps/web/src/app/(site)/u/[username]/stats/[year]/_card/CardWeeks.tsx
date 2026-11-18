import type { CSSProperties } from 'react';

import { WEEKS } from '@/lib/stats/weeks';
import { weekLinesSvg } from '../../_components/weekLines';
import type { CardStreak } from './cardModel';
import { labelFont } from './fonts';
import type { CardLayout } from './layout';
import type { ThemeStyle } from './theme';

/** The card's lines are a touch brighter than the page's */
const WEEK_COLOR = 'rgba(255,255,255,0.28)';
const EMPTY_COLOR = 'rgba(255,255,255,0.1)';

/**
 * The 53 week lines with the streak bracket and its line under them. The
 * card spreads the lines edge to edge (`space-between`), while
 * `weekLinesSvg` centres each in an equal slot: the drawing is widened and
 * shifted so its first and last lines touch the edges. The bracket spans
 * the streak's slots, as on the page.
 */
export default function CardWeeks({
  layout,
  streak,
  style,
  top,
  weeks,
}: Readonly<{
  layout: CardLayout;
  streak: CardStreak | null;
  style: ThemeStyle;
  /** The lines' top: the layout's, or higher on a story without a wall */
  top: number;
  weeks: ReadonlyArray<number>;
}>) {
  const { left, width, height, lineWidth } = layout.weeks;
  const border = `2px solid ${style.bracket}`;
  const drawingWidth = ((width - lineWidth) * WEEKS) / (WEEKS - 1);
  const shift = lineWidth / 2 - (width - lineWidth) / (2 * (WEEKS - 1));
  const lines = weekLinesSvg({
    emptyColor: EMPTY_COLOR,
    height,
    lineWidth,
    stub: lineWidth,
    values: weeks,
    weekColor: WEEK_COLOR,
    width: drawingWidth,
  });
  const bracketTop = top + height + layout.weeks.bracketGap;
  const linesStyle: CSSProperties = {
    display: 'flex',
    height,
    left: left + shift,
    position: 'absolute',
    top,
    width: drawingWidth,
  };
  const streakLineStyle: CSSProperties = {
    color: style.soft,
    fontFamily: labelFont(layout.weeks.lineSize),
    fontSize: layout.weeks.lineSize,
    left,
    lineHeight: 1.3,
    position: 'absolute',
    top: bracketTop + layout.weeks.lineGap,
    whiteSpace: 'nowrap',
  };
  return (
    <>
      <div style={linesStyle}>{lines}</div>
      {streak ? (
        <>
          <div
            style={{
              borderBottom: border,
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
              borderLeft: border,
              borderRight: border,
              height: layout.weeks.bracketHeight,
              left: Math.round(left + (streak.first / WEEKS) * width),
              position: 'absolute',
              top: bracketTop,
              width: Math.round(
                ((streak.last - streak.first + 1) / WEEKS) * width,
              ),
            }}
          />
          <div style={streakLineStyle}>{streak.line}</div>
        </>
      ) : null}
    </>
  );
}
