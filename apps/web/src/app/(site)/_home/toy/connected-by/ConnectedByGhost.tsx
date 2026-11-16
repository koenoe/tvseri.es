import WatchlistToggleGhost from '@/components/marking/WatchlistToggleGhost';
import {
  ButtonFace,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { routeGlyph, shuffleGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { ACTION_PAIR } from '../../actionPair';
import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { TOY_TITLE } from '../../moments';
import { CHAIN, LINK_BOX } from './Chain';
import {
  ANOTHER_PATH_LABEL,
  CONNECTED_CARD,
  HEAD_WATCHLIST,
  PATH_FOOT,
  PATH_HEAD,
  PATH_LABEL,
  PATH_SWITCH,
  PATH_TITLE,
  PATH_TITLE_SLOT,
} from './layout';
import { NAME, NODE, PERSON_EMPTY, ROLES, SHOW_EMPTY } from './Nodes';

const CHAIN_GHOST = cn(CHAIN, PULSE);
const ACTIONS = cn(ACTION_PAIR, PATH_SWITCH, PULSE);
const TITLE_SLOT = cn('block', PATH_TITLE_SLOT, PULSE);
const FOOT = cn(PATH_FOOT, PULSE);

/** On a phone (112px nodes) names and roles take two lines' box each, and so does the head's title */
const NAME_PHONE = cn(NAME, 'md:hidden');
/** and a person's roles too */
const ROLES_PHONE = cn(ROLES, 'md:hidden');
const TITLE_PHONE = cn(PATH_TITLE, 'md:hidden');

/** A link between two nodes: a flat bar in its box, no arrow (a skeleton draws no finished UI) */
function Line() {
  return (
    <span className={LINK_BOX}>
      <Ghost className="h-0.5 flex-1 rounded-2" />
    </span>
  );
}

function ShowGhost() {
  return (
    <span className={NODE}>
      <span className={SHOW_EMPTY} />
      <span className="flex flex-col items-center">
        <TextLine className={NAME} width="w-20" />
        <TextLine className={NAME_PHONE} width="w-14" />
      </span>
    </span>
  );
}

function PersonGhost() {
  return (
    <span className={NODE}>
      <span className={PERSON_EMPTY} />
      <span className="flex flex-col items-center">
        <TextLine className={NAME} width="w-20" />
        <TextLine className={NAME_PHONE} width="w-14" />
      </span>
      <span className="flex flex-col items-center">
        <TextLine className={ROLES} width="w-20" />
        <TextLine className={ROLES_PHONE} width="w-12" />
      </span>
    </span>
  );
}

/**
 * Connected by's placeholder, in the moment's frame: the card with its head
 * (the real label, "{A} to {B}, in 2 steps" to come, Watchlist and "Another
 * path" as flat pills; on a phone the Watchlist under the path) and a
 * two-step chain, show, person, show, person, show, flat bars between the
 * nodes' empty poster and face boxes.
 */
export default function ConnectedByGhost() {
  return (
    <MomentFrame name="toy" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CONNECTED_CARD}>
          <div className={PATH_HEAD}>
            <MomentLabel
              className={PATH_LABEL}
              glyph={routeGlyph}
              title={TOY_TITLE['connected-by']}
            />
            <span className={TITLE_SLOT}>
              <TextLine className={PATH_TITLE} width="w-56 md:w-80" />
              <TextLine className={TITLE_PHONE} width="w-24" />
            </span>
            <span className={ACTIONS}>
              <WatchlistToggleGhost className={HEAD_WATCHLIST} size="md" />
              <ButtonFace icon={shuffleGlyph} size="md">
                {ANOTHER_PATH_LABEL}
              </ButtonFace>
            </span>
          </div>
          <div className={CHAIN_GHOST}>
            <ShowGhost />
            <Line />
            <PersonGhost />
            <Line />
            <ShowGhost />
            <Line />
            <PersonGhost />
            <Line />
            <ShowGhost />
          </div>
          <div className={FOOT}>
            <WatchlistToggleGhost size="md" />
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
