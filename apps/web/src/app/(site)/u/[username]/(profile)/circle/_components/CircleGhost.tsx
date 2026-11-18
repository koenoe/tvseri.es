import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

import { ACTION, FIRST_ROW, GO, LEAD, LINE, LIST, ROW } from './rowBoxes';

/** The rows pulse as one layer */
const GHOST_LIST = `${LIST} animate-ghost`;

const ROWS = 5;

const BAR = `block rounded-6 ${GHOST_FILL}`;

const ROW_GHOST = `${GHOST_FILL} ${ROW}`;
const LEAD_GHOST = `${GHOST_FILL} ${LEAD}`;
const NAME_LINE = `flex items-center ${LINE.name}`;
const NAME_BAR = `h-[18px] w-[24%] ${BAR}`;
const LEVEL_LINE = `flex items-center ${LINE.level}`;
const LEVEL_BAR = `h-3 w-[52%] ${BAR}`;
const WATCHING_LINE = `flex items-center ${LINE.watching}`;
const WATCHING_BAR = `h-3 w-[34%] ${BAR}`;
const ACTION_GHOST = `block h-8 w-[108px] rounded-full md:h-9 md:w-[112px] ${GHOST_FILL}`;
const GO_GHOST = `${GHOST_FILL} ${GO}`;

function GhostRow({
  first,
  owner,
}: Readonly<{ first: boolean; owner: boolean }>) {
  return (
    <li className={ROW_GHOST} data-placeholder={first ? FIRST_ROW : undefined}>
      <span className={LEAD_GHOST} />
      <span className="min-w-0">
        <span className={NAME_LINE}>
          <span className={NAME_BAR} />
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
      <span className={ACTION}>
        <span className={ACTION_GHOST} />
      </span>
      <span className={GO_GHOST} />
    </li>
  );
}

/**
 * The Circle's rows while they load: five ghost rows in the rows' own
 * boxes, so the list doesn't move when it lands. `owner` draws the level
 * line under the name; a visitor's rows have no such line.
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
