import Hole from '../_components/blocks/Hole';
import SidebarBlocksSkeleton, {
  SIDEBAR_BLOCKS_CLASS,
  SidebarRule,
} from '../_components/shell/SidebarBlocksSkeleton';
import SidebarBlocks from '../_components/sidebar/SidebarBlocks';
import { getProfile, type ProfileParams } from '../_data/profile';

type Props = Readonly<{ params: ProfileParams }>;

const FROM_TABLET = 'contents max-md:hidden';

/**
 * The overview's sidebar under the identity: a rule, then the
 * blocks about them (the match card for a visitor, Watchlist, Start
 * something new for the owner, this year so far). Every block fails alone.
 * Not on a phone: there the identity sits right above the tabs, as on every
 * sub-page. Hidden around the hole, so the blocks, their placeholder and
 * their failure card go together.
 */
export default function OverviewAside({ params }: Props) {
  return (
    <div className={FROM_TABLET}>
      <Hole bare fallback={<SidebarBlocksSkeleton />} title="The sidebar">
        <Blocks params={params} />
      </Hole>
    </div>
  );
}

async function Blocks({ params }: Props) {
  const profile = await getProfile(params);
  return (
    <div className={SIDEBAR_BLOCKS_CLASS} data-slot="profile-blocks">
      <SidebarRule />
      <SidebarBlocks profile={profile} />
    </div>
  );
}
