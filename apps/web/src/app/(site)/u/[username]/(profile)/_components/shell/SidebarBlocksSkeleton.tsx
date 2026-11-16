import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { MatchCardSkeleton } from '../visitor/MatchCard';
import SidebarRule from './SidebarRule';

/** The rule between the identity and the overview's blocks (`SidebarRule`) */
export { SidebarRule };

/**
 * The overview's sidebar under the identity, a column 40px apart, after the
 * rule. On a tablet (md to lg) it sits above the page at full width, so its
 * blocks flow into two columns of about the sidebar's width (the rule across
 * both). On a phone it has no box and no rules: someone else's match card
 * sits between the identity and the tabs, 20px from each. The placeholder's
 * blocks sit in `OwnerVisitor`'s `contents` wrappers, hence the second pair
 * of rules.
 */
export const SIDEBAR_BLOCKS_CLASS =
  'flex flex-col gap-10 md:max-lg:block md:max-lg:columns-2 md:max-lg:gap-x-10 md:max-lg:*:mb-10 md:max-lg:*:break-inside-avoid md:max-lg:[&>:first-child]:block md:max-lg:[&>:first-child]:[column-span:all] md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:mb-10 md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:break-inside-avoid max-md:contents max-md:[&>:first-child]:hidden';

/** The rule under the match card: gone on a tablet, where the blocks sit in two columns, and on a phone */
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
            <div data-placeholder="your-match">
              <MatchCardSkeleton />
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
