import type { CircleRow } from '@tvseri.es/schemas';
import LevelMeter from '../../_components/blocks/LevelMeter';
import SharedCount from '../../_components/blocks/SharedCount';
import FollowButton from '../../_components/shell/FollowButton';
import { LEVELS } from '../../_components/visitor/match/levels';
import { levelLine, proofLine } from '../../_lib/circleCopy';
import PersonRow from './PersonRow';
import { LINE, TAG } from './rowBoxes';

const NO_TAGS = [] as const;

/** "Follows you" beside the name from md; on a phone it ends the level line, so the name keeps its width */
const TAG_BESIDE_NAME = `${TAG} max-md:hidden`;
const TAG_IN_LEVEL_LINE = `${TAG} ml-auto md:hidden`;

const LEVEL_LINE = `flex min-w-0 items-center gap-2 text-meta whitespace-nowrap text-white/60 ${LINE.level}`;

/**
 * A row on your own Circle: the name with the shared count and "Follows
 * you" on a mutual (at the end of the level line on a phone), the level
 * meter, the level and its one-line reason, what they're watching,
 * and Following (or Follow back for someone who follows you and you don't
 * follow). No lead: the name starts the row.
 */
export default function OwnerPersonRow({
  first,
  row,
}: Readonly<{ first?: boolean; row: CircleRow }>) {
  const { level, sharedCount } = row.match;
  const levelClass = level ? LEVELS[level].text : 'text-white/80';
  const levelWord = `shrink-0 font-semibold ${levelClass}`;
  // in the "Follows you" section the heading says it
  const mutual = row.followsYou && row.following;
  const line = (
    <div className={LEVEL_LINE}>
      <LevelMeter level={level} size="row" />
      <b className={levelWord}>{levelLine(level)}</b>
      <span className="min-w-0 truncate">{proofLine(row.match)}</span>
      {mutual ? <span className={TAG_IN_LEVEL_LINE}>Follows you</span> : null}
    </div>
  );
  const fact = (
    <>
      <SharedCount count={sharedCount} />
      {mutual ? <span className={TAG_BESIDE_NAME}>Follows you</span> : null}
    </>
  );
  const action = (
    <FollowButton
      followLabel={row.followsYou ? 'Follow back' : 'Follow'}
      initialFollowing={row.following}
      size="circle"
      userId={row.id}
      username={row.username}
    />
  );
  return (
    <PersonRow
      action={action}
      fact={fact}
      first={first}
      line={line}
      tags={NO_TAGS}
      username={row.username}
      watching={row.watching}
    />
  );
}
