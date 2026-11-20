import statsPath from '@/lib/routing/statsPath';

import { getProfile, type ProfileParams } from '../../_data/profile';
import { orNull } from '../../_lib/orNull';
import TabLinks from './TabLinks';
import TabsFrame from './TabsFrame';

/**
 * The tab bar of a profile (signed in only: `getProfile` 401s otherwise).
 * Every profile has all six tabs; the profile read (the identity's own,
 * deduped) only names them with the stored spelling of the username. When
 * that read fails (the identity says so), they are named from the URL.
 */
export default async function ProfileTabs({
  params,
}: Readonly<{ params: ProfileParams }>) {
  const profile = await orNull(getProfile(params));
  const username = profile?.user.username ?? (await params).username;
  const statsHref = statsPath(username, new Date().getUTCFullYear());
  return (
    <TabsFrame>
      <TabLinks statsHref={statsHref} username={username} />
    </TabsFrame>
  );
}
