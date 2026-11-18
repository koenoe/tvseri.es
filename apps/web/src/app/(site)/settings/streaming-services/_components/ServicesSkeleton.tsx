import { FLAT } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL, GHOST_FILL_OVER } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { GHOST_PANEL } from '../../_components/ghostPanel';
import InputShell from '../../_components/InputShell';
import {
  POPULAR_CARD_CLASS,
  POPULAR_FILTER_CLASS,
  POPULAR_GRID_CLASS,
  POPULAR_HEAD_CLASS,
  POPULAR_MORE_CLASS,
  POPULAR_TITLE_CLASS,
} from './PopularCard';
import { REGION_CARD_CLASS } from './RegionCard';
import { SHELF_CARD_CLASS, SHELF_GRID_CLASS } from './ServicesShelf';
import { SIZES } from './ServiceTile';

/** Typical: four services picked (one row of six, two of three on a phone), seven popular and "Show all" */
const SELECTED = 4;

const REGION_GHOST = cn(REGION_CARD_CLASS, GHOST_PANEL);
const SHELF_GHOST = cn(SHELF_CARD_CLASS, GHOST_PANEL);
const POPULAR_GHOST = cn(POPULAR_CARD_CLASS, GHOST_PANEL);
const FILTER_GHOST = cn(POPULAR_FILTER_CLASS, FLAT);
const POPULAR = 7;

/** The placeholder pulses as one layer; the shapes carry the fill only */
const BAR = cn('rounded-4', GHOST_FILL);
/** A line of text as a bar: the text's own line box, its glyphs hidden */
const line = (className: string) =>
  cn('block text-transparent', BAR, className);

function Tile({ variant }: Readonly<{ variant: keyof typeof SIZES }>) {
  const look = SIZES[variant];
  const big = variant === 'big';
  const labelClass = cn('w-16', line(look.label));
  const imageClass = cn(
    // like the logo: its size, unless the column is narrower (md to lg)
    'h-auto max-w-full shrink-0 aspect-square',
    GHOST_FILL,
    big ? 'w-[72px] max-md:w-14' : 'w-14',
    look.imageClass.includes('rounded-18')
      ? 'rounded-18 max-md:rounded-14'
      : 'rounded-14',
  );
  const tileClass = cn(
    'flex min-w-0 flex-col items-center rounded-16 text-center',
    look.tile,
    // the tile's box, without its ring or tint
    GHOST_FILL_OVER,
    '!shadow-none',
  );
  return (
    <span className={tileClass}>
      <span className={imageClass} />
      <span className={labelClass}>&nbsp;</span>
    </span>
  );
}

const MORE_LABEL = cn('w-22', line(''));

const POPULAR_HEAD_LINE = cn('w-52 text-body', line(''));

const POPULAR_DOT = cn('size-2 shrink-0 rounded-full', GHOST_FILL);

const SHELF_DOT = cn('size-2 rounded-full', GHOST_FILL);

const CHANGE_GHOST = cn('h-8 w-24 shrink-0 rounded-full', GHOST_FILL);

const DETAIL_BAR = cn('block h-5 w-56 max-w-full max-md:h-20', BAR);

const NAME_TAIL_LINE = cn('w-20 md:hidden', line('text-title-3'));

const NAME_LINE = cn('w-40', line('text-title-3'));

const FLAG_GHOST = cn('h-[21px] w-8 shrink-0 max-md:h-4 max-md:w-6', BAR);

/**
 * The hole's placeholder: the three cards of the editor in their own boxes
 * (the real classes), with the real titles and ghost tiles at the typical
 * count. A different number of services changes this section's length only.
 */
export default function ServicesSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-ghost flex-col gap-6">
      <div className={REGION_GHOST}>
        <span className={FLAG_GHOST} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          {/* beside the flag and Change a phone leaves the text 127px at 390: "United Kingdom" takes two lines, its line four */}
          <span className="flex flex-col">
            <b className={NAME_LINE}>&nbsp;</b>
            <b className={NAME_TAIL_LINE}>&nbsp;</b>
          </span>
          <span className={DETAIL_BAR} />
        </span>
        <span className={CHANGE_GHOST} />
      </div>
      <section className={SHELF_GHOST}>
        <div className="flex items-center gap-3">
          <span className={SHELF_DOT} />
          <h3 className="text-body">Your services</h3>
        </div>
        <div className={SHELF_GRID_CLASS}>
          {Array.from({ length: SELECTED }, (_, index) => (
            <Tile key={index} variant="big" />
          ))}
        </div>
      </section>
      <section className={POPULAR_GHOST}>
        <div className={POPULAR_HEAD_CLASS}>
          <span className={POPULAR_TITLE_CLASS}>
            <span className={POPULAR_DOT} />
            <h3 className={POPULAR_HEAD_LINE}>&nbsp;</h3>
          </span>
          <InputShell className={FILTER_GHOST}>
            <span className="size-[15px]" />
          </InputShell>
        </div>
        <div className={POPULAR_GRID_CLASS}>
          {Array.from({ length: POPULAR }, (_, index) => (
            <Tile key={index} variant="rest" />
          ))}
        </div>
        {/* the fold control's box ("Show all 16" and its chevron), the label a bar */}
        <span className={POPULAR_MORE_CLASS}>
          <span className={MORE_LABEL}>&nbsp;</span>
        </span>
      </section>
    </div>
  );
}
