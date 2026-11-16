import { getProfile, type ProfileParams } from '../../_data/profile';
import Identity from './Identity';

/** Names the sidebar (`SidebarFrame`'s `aria-labelledby`) once the profile is known */
export const SIDEBAR_LABEL_ID = 'profile-about';

/**
 * The identity at the top of every profile page's sidebar. It sits in the
 * profile layout, so it stays mounted across tab and shelf switches; only
 * the profile read decides whether the page exists.
 */
export default async function ProfileIdentity({
  params,
}: Readonly<{ params: ProfileParams }>) {
  const profile = await getProfile(params);
  return (
    <div data-slot="profile-identity">
      <span className="sr-only" id={SIDEBAR_LABEL_ID}>
        About {profile.user.username}
      </span>
      <Identity profile={profile} />
    </div>
  );
}
