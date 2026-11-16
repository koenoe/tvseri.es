import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { MatchCardSkeleton } from '../visitor/MatchCard';
import SidebarRule from './SidebarRule';

/** The rule between the identity and the overview's blocks (`SidebarRule`) */
export { SidebarRule };

/**
 * The overview's sidebar under the identity, a column 40px apart, after the
 * rule. Below lg it has no box and no rules: someone else's match card
 * sits between the identity and the tabs (half the page's width on a
 * tablet, as wide as a block of the tail's two columns), and on your own
 * there is nothing.
 */
export const SIDEBAR_BLOCKS_CLASS =
  'flex flex-col gap-10 max-lg:contents max-lg:[&>:first-child]:hidden';

/** The match card's box: half the page's width on a tablet */
export const MATCH_BOX_CLASS = 'md:max-lg:w-[calc(50%-20px)]';

/** The rule under the match card: below lg the tabs follow it */
export const MATCH_RULE_CLASS = 'max-lg:hidden';

/**
 * The sidebar under the identity before the profile resolves, at its real
 * size: nothing of your own, someone else's match card and its rule. Both
 * variants are in the shell and one shows before the first paint
 * (`OwnerVisitor`).
 */
export default function SidebarBlocksSkeleton() {
  return (
    <div className={SIDEBAR_BLOCKS_CLASS} data-placeholder="profile-blocks">
      <SidebarRule />
      <OwnerVisitor
        owner={null}
        visitor={
          <>
            <div className={MATCH_BOX_CLASS}>
              <div data-placeholder="your-match">
                <MatchCardSkeleton />
              </div>
            </div>
            <span className={`contents ${MATCH_RULE_CLASS}`}>
              <SidebarRule />
            </span>
          </>
        }
      />
    </div>
  );
}
