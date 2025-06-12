import { unauthorized } from 'next/navigation';

import auth from '@/auth';
import Search from '@/components/Track/Search';

export default async function TrackPage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  return <Search />;
}
