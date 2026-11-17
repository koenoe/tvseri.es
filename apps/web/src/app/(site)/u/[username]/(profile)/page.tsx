import type { Metadata } from 'next';

import Hole from './_components/blocks/Hole';
import OverviewSkeleton from './_components/overview/OverviewSkeleton';
import OwnerOverview from './_components/overview/OwnerOverview';
import VisitorOverview from './_components/overview/VisitorOverview';
import {
  getProfile,
  type ProfileParams,
  profileMetadata,
} from './_data/profile';

type Props = Readonly<{ params: ProfileParams }>;

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata(params, (username) => `@${username}`);
}

/** The profile overview: yours or someone else's */
export default function ProfilePage({ params }: Props) {
  return (
    <Hole bare fallback={<OverviewSkeleton />} title="Overview">
      <Overview params={params} />
    </Hole>
  );
}

async function Overview({ params }: Props) {
  const profile = await getProfile(params, '');
  return profile.viewer === 'owner' ? (
    <OwnerOverview profile={profile} />
  ) : (
    <VisitorOverview profile={profile} />
  );
}
