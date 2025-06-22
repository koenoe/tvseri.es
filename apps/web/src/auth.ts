import { cache } from 'react';

import { cookies } from 'next/headers';

import { me } from './lib/api';

const auth = cache(async () => {
  const encryptedSessionId = (await cookies()).get('sessionId')?.value;

  if (!encryptedSessionId) {
    return {
      user: null,
      session: null,
      encryptedSessionId: null,
    };
  }

  const result = await me({
    sessionId: encryptedSessionId,
  });

  return {
    ...result,
    encryptedSessionId,
  };
});

export default auth;
