import { userGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { FollowItem } from '@/lib/profile/views';

import FollowButton from '../../_components/shell/FollowButton';
import { relationTags } from '../../_lib/circleCopy';
import PersonRow from './PersonRow';
import { LEAD } from './rowBoxes';

/** No ring on someone else's Circle: your match with each person lives on their profile */
const lead = (
  <span
    className={`flex items-center justify-center bg-white/6 text-white/60 ${LEAD}`}
  >
    <Icon glyph={userGlyph} size={20} />
  </span>
);

/**
 * A row on someone else's Circle: the name, your relation
 * (It's you, You follow, Follows you), what they're watching, and Follow
 * (not on yourself).
 */
export default function VisitorPersonRow({
  first,
  person,
}: Readonly<{ first?: boolean; person: FollowItem }>) {
  const action = person.isMe ? undefined : (
    <FollowButton
      initialFollowing={person.isFollowing}
      size="circle"
      userId={person.id}
      username={person.username}
    />
  );
  return (
    <PersonRow
      action={action}
      first={first}
      lead={lead}
      tags={relationTags(person)}
      username={person.username}
      watching={person.watching}
    />
  );
}
