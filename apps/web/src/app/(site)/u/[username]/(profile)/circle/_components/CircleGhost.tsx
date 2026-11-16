import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

import { ACTION, FIRST_ROW, GO, LEAD, LINE, LIST, ROW } from './rowBoxes';

/** The rows pulse as one layer */
const GHOST_LIST = `${LIST} animate-ghost`;

/** Five person rows */
const ROWS = 5;

const BAR = `block rounded-6 ${GHOST_FILL}`;

function GhostRow({
  first,
  owner,
}: Readonly<{ first: boolean; owner: boolean }>) {
  return (
    <li
      className={`${GHOST_FILL} ${ROW}`}
      data-placeholder={first ? FIRST_ROW : undefined}
    >
      <span className={`${GHOST_FILL} ${LEAD}`} />
      <span className="min-w-0">
        <span className={`flex items-center ${LINE.name}`}>
          <span className={`h-[18px] w-[24%] ${BAR}`} />
        </span>
        {owner ? (
          <span className={`flex items-center ${LINE.level}`}>
            <span className={`h-3 w-[52%] ${BAR}`} />
          </span>
        ) : null}
        <span className={`flex items-center ${LINE.watching}`}>
          <span className={`h-3 w-[34%] ${BAR}`} />
        </span>
      </span>
      <span className={ACTION}>
        <span
          className={`block h-8 w-[108px] rounded-full md:h-9 md:w-[112px] ${GHOST_FILL}`}
        />
      </span>
      <span className={`${GHOST_FILL} ${GO}`} />
    </li>
  );
}

/**
 * The Circle's rows while they load: five ghost rows in
 * the rows' own boxes, so the list doesn't move when it lands. `owner`
 * draws the level line under the name; a visitor's rows have no such line.
 */
export default function CircleGhost({ owner }: Readonly<{ owner: boolean }>) {
  return (
    <ul aria-hidden="true" className={GHOST_LIST}>
      {Array.from({ length: ROWS }, (_, index) => (
        <GhostRow first={index === 0} key={index} owner={owner} />
      ))}
    </ul>
  );
}
