import { cookies } from 'next/headers';

import { fetchAccountDetails } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import LoginButton from './LoginButton';

export default async function LoginButtonContainer() {
  const cookieStore = cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const user = await fetchAccountDetails(decryptedSessionId);

    return (
      <LoginButton profileName={user.username ?? user.name ?? 'anonymous'} />
    );
  }

  return <LoginButton />;
}
