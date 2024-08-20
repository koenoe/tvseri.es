import { cookies } from 'next/headers';

import { fetchAccountDetails } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import LoginButton from './LoginButton';

export default async function LoginButtonContainer() {
  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const user = await fetchAccountDetails(decryptedSessionId);
    const profileName = user.username ?? user.name ?? 'anonymous';

    return <LoginButton profileName={profileName} />;
  }

  return <LoginButton />;
}
