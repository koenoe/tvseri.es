import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

import { BARE_ROW, FIRST_ROW, LEAD, LEAD_ROW, LINE, LIST } from './rowBoxes';

/** The rows pulse as one layer */
const GHOST_LIST = `${LIST} animate-ghost`;

const ROWS = 5;

const BAR = `block rounded-6 ${GHOST_FILL}`;

const LEAD_GHOST = `${GHOST_FILL} ${LEAD}`;
const NAME_LINE = `flex items-center gap-2.5 ${LINE.name}`;
const NAME_BAR = `h-[18px] w-[24%] ${BAR}`;
/** "59 shared series" beside the name */
const FACT_BAR = `h-3 w-[104px] ${BAR}`;
const LEVEL_LINE = `flex items-center ${LINE.level}`;
const LEVEL_BAR = `h-3 w-[52%] ${BAR}`;
const WATCHING_LINE = `flex items-center ${LINE.watching}`;
const WATCHING_BAR = `h-3 w-[34%] ${BAR}`;
const ACTION_GHOST = `block h-8 w-[108px] rounded-full md:h-9 md:w-[112px] ${GHOST_FILL}`;

function GhostRow({
  first,
  owner,
}: Readonly<{ first: boolean; owner: boolean }>) {
  const boxes = owner ? BARE_ROW : LEAD_ROW;
  const rowGhost = `${GHOST_FILL} ${boxes.row}`;
  const goGhost = `${GHOST_FILL} ${boxes.go}`;
  return (
    <li className={rowGhost} data-placeholder={first ? FIRST_ROW : undefined}>
      {owner ? null : <span className={LEAD_GHOST} />}
      <span className="min-w-0">
        <span className={NAME_LINE}>
          <span className={NAME_BAR} />
          {owner ? <span className={FACT_BAR} /> : null}
        </span>
        {owner ? (
          <span className={LEVEL_LINE}>
            <span className={LEVEL_BAR} />
          </span>
        ) : null}
        <span className={WATCHING_LINE}>
          <span className={WATCHING_BAR} />
        </span>
      </span>
      <span className={boxes.action}>
        <span className={ACTION_GHOST} />
      </span>
      <span className={goGhost} />
    </li>
  );
}

/**
 * The Circle's rows while they load: five ghost rows in the rows' own
 * boxes, so the list doesn't move when it lands. `owner` draws the level
 * line under the name and no lead; a visitor's rows have a lead and no
 * level line.
 */
export default function CircleGhost({ owner }: Readonly<{ owner: boolean }>) {
  return (
    <ul aria-hidden="true" className={GHOST_LIST}>
      {Array.from({ length: ROWS }, (_, index) => {
        const first = index === 0;
        return <GhostRow first={first} key={index} owner={owner} />;
      })}
    </ul>
  );
}
