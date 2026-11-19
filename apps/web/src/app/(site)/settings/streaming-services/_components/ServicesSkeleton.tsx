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
import {
  REGION_CARD_CLASS,
  REGION_CHANGE_CLASS,
  REGION_LINE_CLASS,
  REGION_TEXT_CLASS,
} from './RegionCard';
import { TILE_LOOK } from './ServiceTile';
import {
  SHELF_CARD_CLASS,
  SHELF_HEAD_CLASS,
  SHELF_HINT_CLASS,
  SHELF_LIST_CLASS,
  SHELF_ROW_CLASS,
} from './shelfLook';

/** Ghost rows, each with its own name width; seven popular and "Show all" */
const SELECTED = [
  'w-24',
  'w-[118px]',
  'w-14',
  'w-[150px]',
  'w-[84px]',
  'w-[74px]',
];

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

/** A ghost row: handle, place, logo, name, × (the shapes the real row has) */
const ROW_GHOST = cn(
  SHELF_ROW_CLASS,
  'bg-transparent shadow-none',
  GHOST_FILL_OVER,
);
const GRIP_GHOST = cn(
  'mx-3 h-[18px] w-3 shrink-0 rounded-4 max-md:mx-4',
  GHOST_FILL,
);
const PLACE_GHOST = cn('h-3 w-2.5 shrink-0 rounded-[3px]', GHOST_FILL);
const LOGO_GHOST = cn('size-9 shrink-0 rounded-10', GHOST_FILL);
const NAME_GHOST = cn('h-3', BAR);
const REMOVE_GHOST = cn(
  'mr-2.5 ml-auto size-3.5 shrink-0 rounded-4 max-md:mr-4',
  GHOST_FILL,
);
const HINT_GHOST = cn(
  SHELF_HINT_CLASS,
  'h-2.5 w-[360px] max-w-full rounded-4',
  GHOST_FILL,
);

function RowGhost({ name }: Readonly<{ name: string }>) {
  const nameClass = cn(NAME_GHOST, name);
  return (
    <li className={ROW_GHOST}>
      <span className={GRIP_GHOST} />
      <span className={PLACE_GHOST} />
      <span className={LOGO_GHOST} />
      <span className={nameClass} />
      <span className={REMOVE_GHOST} />
    </li>
  );
}

function Tile() {
  const look = TILE_LOOK;
  const labelClass = cn('w-16', line(look.label));
  const imageClass = cn(
    // like the logo: its size, unless the column is narrower (md to lg)
    'h-auto max-w-full shrink-0 aspect-square',
    GHOST_FILL,
    'w-14 rounded-14',
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

const CHANGE_GHOST = cn(
  'h-8 w-24 shrink-0 rounded-full',
  GHOST_FILL,
  REGION_CHANGE_CLASS,
);

/** On a phone the line has the card's width: two lines at 390 */
const DETAIL_BAR = cn(
  'block h-5 w-56 max-w-full max-md:h-10 max-md:w-full',
  BAR,
  REGION_LINE_CLASS,
);

const NAME_LINE = cn('w-40 max-w-full', line('text-title-3'));

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
        <span className={REGION_TEXT_CLASS}>
          <b className={NAME_LINE}>&nbsp;</b>
          <span className={DETAIL_BAR} />
        </span>
        <span className={CHANGE_GHOST} />
      </div>
      <section className={SHELF_GHOST}>
        <div className={SHELF_HEAD_CLASS}>
          <span className={SHELF_DOT} />
          <h3 className="text-body">Your services</h3>
        </div>
        <span className={HINT_GHOST} />
        <ol className={SHELF_LIST_CLASS}>
          {SELECTED.map((name) => (
            <RowGhost key={name} name={name} />
          ))}
        </ol>
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
            <Tile key={index} />
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
