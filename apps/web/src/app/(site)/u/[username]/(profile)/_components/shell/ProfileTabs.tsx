import { isUnavailable } from '@/lib/cache/unavailable';
import { readProfileCounts } from '@/lib/profile/counts';
import statsPath from '@/lib/routing/statsPath';

import {
  getProfile,
  type Profile,
  type ProfileParams,
} from '../../_data/profile';
import { orNull } from '../../_lib/orNull';
import TabLinks from './TabLinks';
import TabsFrame from './TabsFrame';
import { hasStatsFromEpisodes, PROFILE_TABS, visibleTabs } from './tabs';

/**
 * The tab bar of a profile (signed in only: `getProfile` 401s otherwise).
 * Which tabs show depends on the owner's follow counts (the identity's own
 * read, deduped) and on its stored episode count for Stats (the same
 * read); a read that fails keeps its tab. When the profile read itself
 * fails (the identity says so), every tab stays, named from the URL.
 */
export default async function ProfileTabs({
  params,
}: Readonly<{ params: ProfileParams }>) {
  const profile = await orNull(getProfile(params));
  const username = profile?.user.username ?? (await params).username;
  const tabs = profile ? await profileTabs(profile) : PROFILE_TABS;
  const segments = tabs.map((tab) => tab.segment);
  const statsHref = statsPath(username, new Date().getUTCFullYear());
  return (
    <TabsFrame>
      <TabLinks segments={segments} statsHref={statsHref} username={username} />
    </TabsFrame>
  );
}

/** The tabs this profile has something behind */
async function profileTabs(profile: Profile) {
  // The Stats tab from the stored episode count, not the whole history
  const counts = await readProfileCounts(profile.user.id);
  const known = isUnavailable(counts) ? null : counts;
  return visibleTabs({
    followers: known?.followers ?? null,
    following: known?.following ?? null,
    hasStats: hasStatsFromEpisodes(known?.episodes ?? null),
  });
}
