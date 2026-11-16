import Hole from '../_components/blocks/Hole';
import OverviewMarker from '../_components/shell/OverviewMarker';
import SidebarBlocksSkeleton, {
  SIDEBAR_BLOCKS_CLASS,
  SidebarRule,
} from '../_components/shell/SidebarBlocksSkeleton';
import { SidebarHead } from '../_components/sidebar/SidebarBlocks';
import { getProfile, type ProfileParams } from '../_data/profile';

type Props = Readonly<{ params: ProfileParams }>;

/**
 * The overview's sidebar under the identity: a rule, then someone else's
 * match card. The rest of the sidebar is `@tail`, after the page
 * (`overviewLayout.ts`). Every block fails alone.
 */
export default function OverviewAside({ params }: Props) {
  return (
    <>
      <OverviewMarker />
      <Hole bare fallback={<SidebarBlocksSkeleton />} title="The sidebar">
        <Blocks params={params} />
      </Hole>
    </>
  );
}

async function Blocks({ params }: Props) {
  const profile = await getProfile(params);
  return (
    <div className={SIDEBAR_BLOCKS_CLASS} data-slot="profile-blocks">
      <SidebarRule />
      <SidebarHead profile={profile} />
    </div>
  );
}
