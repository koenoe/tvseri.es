import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { StartSomethingNewSkeleton } from '../sidebar/StartSomethingNew';
import { WatchlistBlockSkeleton } from '../sidebar/WatchlistBlock';
import { YearSoFarSkeleton } from '../sidebar/YearSoFar';
import { MatchCardSkeleton } from '../visitor/MatchCard';
import SidebarRule from './SidebarRule';

/** The rule between the identity and the overview's blocks (`SidebarRule`) */
export { SidebarRule };

/**
 * The overview's sidebar blocks, a column 40px apart, after the rule. On a
 * tablet (md to lg) they sit above the page at full width, so they flow
 * into two columns of about the sidebar's width (the rule across both),
 * instead of each block stretched to 700px. The placeholder's blocks sit in
 * `OwnerVisitor`'s `contents` wrappers, hence the second pair of rules.
 */
export const SIDEBAR_BLOCKS_CLASS =
  'flex flex-col gap-10 md:max-lg:block md:max-lg:columns-2 md:max-lg:gap-x-10 md:max-lg:*:mb-10 md:max-lg:*:break-inside-avoid md:max-lg:[&>:first-child]:block md:max-lg:[&>:first-child]:[column-span:all] md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:mb-10 md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:break-inside-avoid';

/** The rule under the match card: gone on a tablet, where the blocks sit in two columns */
export const MATCH_RULE_CLASS = 'md:max-lg:hidden';

/**
 * The overview's sidebar blocks before the profile resolves, at their real
 * size. On a tablet they sit above the page, so they hold all of it or the
 * page jumps when they land (a phone shows none: `@aside/page.tsx`). Both
 * variants are in the shell and one shows before the first paint (`OwnerVisitor`): yours (Watchlist, Start
 * something new, this year) or someone else's (the match card and its
 * rule, Watchlist, this year).
 */
export default function SidebarBlocksSkeleton() {
  return (
    <div className={SIDEBAR_BLOCKS_CLASS} data-placeholder="profile-blocks">
      <SidebarRule />
      <OwnerVisitor
        owner={
          <>
            <WatchlistBlockSkeleton />
            <StartSomethingNewSkeleton />
            <YearSoFarSkeleton />
          </>
        }
        visitor={
          <>
            <MatchCardSkeleton />
            <span className={`contents ${MATCH_RULE_CLASS}`}>
              <SidebarRule />
            </span>
            <WatchlistBlockSkeleton />
            <YearSoFarSkeleton />
          </>
        }
      />
    </div>
  );
}
