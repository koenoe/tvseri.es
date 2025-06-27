import { cookies } from 'next/headers';
import { cache } from 'react';

import { me } from './lib/api';

const auth = cache(async () => {
  const encryptedSessionId = (await cookies()).get('sessionId')?.value;

  if (!encryptedSessionId) {
    return {
      encryptedSessionId: null,
      session: null,
      user: null,
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
