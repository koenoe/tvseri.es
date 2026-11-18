import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import PageKindMarker from '../../_components/shell/PageKindMarker';
import SidebarRule from '../../_components/shell/SidebarRule';
import MatchKey from '../../circle/_components/MatchKey';

/**
 * Circle's sidebar under the identity: a rule, then "How a match is made"
 * on your own Circle; nothing on someone else's (a ring is your match with
 * that person, and lives on their profile). Static copy, so the owner's key
 * is in the shell. With the sidebar only (`lg`). Following nobody, the page
 * says so (`data-follows-nobody`) and the key goes.
 */
export default function CircleAside() {
  return (
    <>
      <PageKindMarker kind="subpage" />
      <OwnerVisitor
        owner={
          <div className="-mt-2 flex flex-col gap-7 max-lg:hidden group-has-[[data-follows-nobody]]/profile:hidden">
            <SidebarRule />
            <MatchKey />
          </div>
        }
        visitor={null}
      />
    </>
  );
}
