import { pick } from '@tvseri.es/utils';
import { unauthorized } from 'next/navigation';

import auth from '@/auth';
import ProfileForm from '@/components/Settings/ProfileForm';

const PROFILE_KEYS = ['email', 'name', 'username'] as const;

export default async function SettingsProfilePage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  // Note: only send what the form reads
  const profile = pick(user, PROFILE_KEYS);

  return <ProfileForm user={profile} />;
}
