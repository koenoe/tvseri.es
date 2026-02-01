import { unauthorized } from 'next/navigation';

import auth from '@/auth';
import ProfileForm from '@/components/Settings/ProfileForm';

export default async function ProfileContainer() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  return <ProfileForm user={user} />;
}
