import { PULSE } from '@/components/ui/ghost/ghosts';
import IdentityLinesGhost from '@/components/ui/identity/IdentityLinesGhost';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { CompactMetaSkeleton } from './IdentityMeta';
import { ProfileActionSkeleton } from './ProfileAction';
import { COMPACT_IDENTITY_CLASS, FULL_IDENTITY_CLASS } from './subpage';

const HANDLE_GHOST = cn('h-[46px] w-40 rounded-8', GHOST_FILL, PULSE);
const WATCHES_ON_GHOST = cn('h-[22px] w-full rounded-4', GHOST_FILL, PULSE);
const COMPACT_HANDLE_GHOST = cn('h-8 w-32 rounded-8', GHOST_FILL, PULSE);

/** The full identity's ghost: 48px handle, three meta lines, Watches on, the 42px button */
export function FullIdentitySkeleton() {
  return (
    <div className={FULL_IDENTITY_CLASS}>
      <span className={HANDLE_GHOST} />
      <IdentityLinesGhost className={PULSE} />
      <span className={WATCHES_ON_GHOST} />
      <ProfileActionSkeleton />
    </div>
  );
}

/** The compact identity's ghost (a phone's sub-pages): 40px handle line, one 20px line, the 32px pill */
export function CompactIdentitySkeleton() {
  return (
    <div className={COMPACT_IDENTITY_CLASS}>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="flex h-10 items-center">
          <span className={COMPACT_HANDLE_GHOST} />
        </span>
        <CompactMetaSkeleton />
      </div>
      <ProfileActionSkeleton size="compact" />
    </div>
  );
}

/**
 * The identity before the profile resolves, at its real size, in both
 * variants like `Identity` (only one shows).
 */
export default function IdentitySkeleton() {
  return (
    <div aria-hidden="true" data-placeholder="profile-identity">
      <FullIdentitySkeleton />
      <CompactIdentitySkeleton />
    </div>
  );
}
