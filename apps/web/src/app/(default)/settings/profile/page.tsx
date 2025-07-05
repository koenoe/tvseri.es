import { unauthorized } from 'next/navigation';

import auth from '@/auth';
import ProfileForm from '@/components/Settings/ProfileForm';

export default async function SettingsProfilePage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  return <ProfileForm user={user} />;
}
