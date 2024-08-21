import { cookies } from 'next/headers';

import { fetchAccountDetails } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

export default async function Username() {
  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const user = await fetchAccountDetails(decryptedSessionId);
  const profileName = user.username ?? user.name ?? 'anonymous';

  return (
    <div className="relative flex h-[18px] w-auto items-center justify-end overflow-hidden text-base lowercase leading-none text-white">
      <span className="relative h-full truncate text-ellipsis">
        {profileName}
      </span>
    </div>
  );
}
