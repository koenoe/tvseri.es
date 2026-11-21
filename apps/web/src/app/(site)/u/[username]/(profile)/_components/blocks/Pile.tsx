'use client';

import * as m from 'motion/react-m';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import { HIT_ALL } from '@/components/ui/button/hitArea';
import { seasonGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

const OFFSET = 12;
const VISIBLE = 3;
const TRANSITION = { duration: 0.25, ease: [0.4, 0, 0.2, 1] } as const;

/** The count chip */
const CHIP =
  'absolute top-2 left-2 z-20 flex h-6 items-center gap-[5px] rounded-full bg-[rgb(15_20_20/0.6)] px-2 text-caption font-medium tabular-nums text-white backdrop-blur-[12px]';
const COUNT_BADGE = `pointer-events-none ${CHIP}`;

export type PileCardData = Readonly<{ key: string; node: ReactNode }>;

/**
 * Where the cards behind peek out: `above` for posters (Recently
 * watched), `below` for rows (History). Literal class names, so Tailwind
 * sees them.
 */
const PEEK = {
  above: { origin: 'origin-top', pad: '', sign: -1 },
  below: {
    origin: 'origin-bottom',
    pad: 'group-data-[open=false]/pile:pb-6',
    sign: 1,
  },
} as const;

/**
 * Episodes of one show watched in a row as a pile that spreads (Recently
 * watched and History): closed, one toggle button covers up to three cards
 * stacked behind each other (the others are inert and hidden from assistive
 * tech); open, the cards spread into `spreadClass`'s grid, each a real
 * link, and the count chip folds the pile again. Position, scale and
 * opacity animate (transforms only; Motion layout FLIP from the first
 * toggle on, so untouched piles measure nothing). Needs a `MaxMotion`
 * above. The parent owns `open` (a tile also widens its slot).
 */
export default function Pile({
  cards,
  columns,
  footer,
  label,
  onToggle,
  open,
  peek,
  spreadClass,
}: Readonly<{
  cards: ReadonlyArray<PileCardData>;
  /** Columns of the open spread */
  columns: number;
  /** Shown under the closed pile (the range label) */
  footer?: ReactNode;
  /** The show's name, for the toggle's label */
  label: string;
  onToggle: () => void;
  open: boolean;
  peek: keyof typeof PEEK;
  /** The spread's gaps as literal `group-data-[open=true]/pile:gap-*` classes */
  spreadClass: string;
}>) {
  const [touched, setTouched] = useState(false);
  const toggle = useCallback(() => {
    setTouched(true);
    onToggle();
  }, [onToggle]);
  const shown = open ? cards : cards.slice(0, VISIBLE);
  const count = cards.length;
  const toggleLabel = open
    ? `Fold ${label}, ${count} episodes`
    : `Spread ${label}, ${count} episodes`;
  const { origin, pad, sign } = PEEK[peek];
  const columnVar = {
    '--cols': Math.min(count, columns),
  } as React.CSSProperties;
  // open, the fold chip waits for hover or focus (no badge on a spread);
  // touch can't hover, so there it stays to fold the pile again
  const foldClass = `${CHIP} ${HIT_ALL[10]} opacity-0 transition-opacity duration-200 group-hover/pile:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`;
  const toggleClass = open ? foldClass : 'absolute inset-0 z-20 cursor-pointer';
  const fold = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (open && event.key === 'Escape') {
        onToggle();
      }
    },
    [onToggle, open],
  );
  const grid = `grid grid-cols-[minmax(0,1fr)] group-data-[open=true]/pile:grid-cols-[repeat(var(--cols),minmax(0,1fr))] ${spreadClass}`;
  const pileClass = `group/pile relative ${pad}`;
  return (
    <div className={pileClass} data-open={open} onKeyDown={fold}>
      <button
        aria-expanded={open}
        aria-label={toggleLabel}
        className={toggleClass}
        onClick={toggle}
        type="button"
      >
        {open ? <Count count={count} /> : null}
      </button>
      {open ? null : (
        <span aria-hidden="true" className={COUNT_BADGE}>
          <Count count={count} />
        </span>
      )}
      <div className={grid} style={columnVar}>
        {shown.map((card, index) => {
          const depth = Math.min(index, VISIBLE - 1);
          return (
            <PileCard
              card={card}
              depth={depth}
              index={index}
              key={card.key}
              open={open}
              origin={origin}
              sign={sign}
              total={shown.length}
              touched={touched}
            />
          );
        })}
      </div>
      {footer ? (
        <div className="group-data-[open=true]/pile:hidden">{footer}</div>
      ) : null}
    </div>
  );
}

function Count({ count }: Readonly<{ count: number }>) {
  return (
    <>
      <Icon glyph={seasonGlyph} size={13} />
      {count}
    </>
  );
}

function PileCard({
  card,
  depth,
  index,
  open,
  origin,
  sign,
  touched,
  total,
}: Readonly<{
  card: PileCardData;
  depth: number;
  index: number;
  open: boolean;
  origin: string;
  sign: number;
  touched: boolean;
  total: number;
}>) {
  const layer = { zIndex: total - index };
  const animate = open
    ? { opacity: 1, scale: 1, y: 0 }
    : {
        opacity: 1 - depth * 0.3,
        scale: 1 - depth * 0.08,
        y: sign * depth * OFFSET,
      };
  const behind = !open && index > 0;
  const hiddenBehind = behind || undefined;
  const closed = !open;
  return (
    <m.div
      className="min-w-0 [grid-area:1/1] group-data-[open=true]/pile:[grid-area:auto]"
      layout={touched}
      style={layer}
    >
      <m.div
        animate={animate}
        aria-hidden={hiddenBehind}
        className={origin}
        inert={closed}
        initial={false}
        transition={TRANSITION}
      >
        {card.node}
      </m.div>
    </m.div>
  );
}
