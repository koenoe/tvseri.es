import Hole from '../_components/blocks/Hole';
import SidebarTailSkeleton, {
  SIDEBAR_TAIL_CLASS,
} from '../_components/shell/SidebarTailSkeleton';
import { SidebarTail } from '../_components/sidebar/SidebarBlocks';
import { getProfile, type ProfileParams } from '../_data/profile';

type Props = Readonly<{ params: ProfileParams }>;

/**
 * The overview's last sidebar blocks (Watchlist, Start something new, the
 * year), after the main column in the DOM: the sidebar's column under the
 * identity on a desktop, the end of the page below it
 * (`overviewLayout.ts`). Every block fails alone.
 */
export default function OverviewTail({ params }: Props) {
  return (
    <Hole bare fallback={<SidebarTailSkeleton />} title="The sidebar">
      <Tail params={params} />
    </Hole>
  );
}

async function Tail({ params }: Props) {
  const profile = await getProfile(params);
  return (
    <div className={SIDEBAR_TAIL_CLASS} data-slot="profile-tail">
      <SidebarTail profile={profile} />
    </div>
  );
}
