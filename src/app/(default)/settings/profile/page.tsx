import { unauthorized } from 'next/navigation';

import ProfileForm from '@/components/Profile/Form';
import auth from '@/lib/auth';

export default async function SettingsProfilePage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  return <ProfileForm user={user} />;
}
