import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';

import { fetchAccountDetails } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import LoginButton from './LoginButton';

export default async function LoginButtonContainer() {
  // FIXME: this shouldn't be needed, but somehow this component is still cached
  // when it shouldn't be. Investigate later.
  noStore();

  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const user = await fetchAccountDetails(decryptedSessionId);

    return (
      <LoginButton profileName={user.username ?? user.name ?? 'anonymous'} />
    );
  }

  return <LoginButton />;
}
