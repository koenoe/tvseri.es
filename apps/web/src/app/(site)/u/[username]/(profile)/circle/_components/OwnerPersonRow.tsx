import type { CircleRow } from '@tvseri.es/schemas';
import MatchRing from '../../_components/blocks/MatchRing';
import { CIRCLE_ROW_RING } from '../../_components/blocks/matchRingLooks';
import FollowButton from '../../_components/shell/FollowButton';
import { LEVELS } from '../../_components/visitor/match/levels';
import { ringLabel } from '../../_components/visitor/match/matchCopy';
import { levelLine, proofLine } from '../../_lib/circleCopy';
import PersonRow from './PersonRow';
import { LEAD, LINE } from './rowBoxes';

const FOLLOWS_YOU = ['Follows you'] as const;
const NO_TAGS = [] as const;

const LEVEL_LINE = `flex min-w-0 items-center gap-2 text-meta whitespace-nowrap text-white/60 ${LINE.level}`;

/**
 * A row on your own Circle: the match ring, "Follows you" on a mutual (in
 * the "Follows you" section the heading says it), the level and
 * its one-line reason, what they're watching, and Following (or Follow back
 * for someone who follows you and you don't follow).
 */
export default function OwnerPersonRow({
  first,
  row,
}: Readonly<{ first?: boolean; row: CircleRow }>) {
  const { level } = row.match;
  const levelClass = level ? LEVELS[level].text : 'text-white/80';
  const levelWord = `shrink-0 font-semibold ${levelClass}`;
  const line = (
    <div className={LEVEL_LINE}>
      <b className={levelWord}>{levelLine(level)}</b>
      <span className="min-w-0 truncate">{proofLine(row.match)}</span>
    </div>
  );
  const ring = ringLabel(level, row.match.sharedCount);
  const lead = (
    <MatchRing
      arc={row.match.arc}
      className={LEAD}
      count={row.match.sharedCount}
      label={ring}
      level={level}
      look={CIRCLE_ROW_RING}
    />
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
  const tags = row.followsYou && row.following ? FOLLOWS_YOU : NO_TAGS;
  return (
    <PersonRow
      action={action}
      first={first}
      lead={lead}
      line={line}
      tags={tags}
      username={row.username}
      watching={row.watching}
    />
  );
}
