import auth from '@/auth';
import { isGetStartedDone } from '@/lib/profile/getStartedDone';
import { isNewAccount } from '@/lib/profile/isNewAccount';
import type { Profile } from '../../_data/profile';
import GetStartedCard from './get-started/GetStartedCard';
import {
  loadGetStartedChoices,
  loadGetStartedStatus,
} from './get-started/loadGetStarted';

/**
 * Get started: new users only, at the top of the column. The
 * `#get-started` anchor is where Home's Get started step 2 lands. Nothing
 * for an account past 30 days, or once it is done (Home's rule,
 * `isGetStartedDone`): no space is kept for it then.
 */
export default async function GetStarted({
  profile,
}: Readonly<{ profile: Profile }>) {
  if (profile.viewer !== 'owner') {
    return null;
  }
  if (!isNewAccount(profile.user.createdAt, Date.now())) {
    return null;
  }
  const status = await loadGetStartedStatus(profile);
  if (!status || isGetStartedDone(status)) {
    return null;
  }
  // the owner's own country and services (the profile read has only their id)
  const { user: me } = await auth();
  const { providers, shows } = await loadGetStartedChoices(
    profile,
    me?.country,
  );
  return (
    <GetStartedCard
      alreadySeen={status.steps.alreadySeen}
      history={status.steps.history}
      providers={providers}
      selected={me?.watchProviders ?? []}
      shows={shows}
    />
  );
}
