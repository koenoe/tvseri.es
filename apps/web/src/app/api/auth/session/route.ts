import { subjects } from '@tvseri.es/schemas';
import {
  client,
  deleteTokens,
  EMPTY_SESSION,
  getTokens,
  setTokens,
} from '@/auth';
import { me } from '@/lib/api';

export async function GET() {
  const tokensFromCookie = await getTokens();

  if (!tokensFromCookie.accessToken || !tokensFromCookie.refreshToken) {
    return Response.json(EMPTY_SESSION);
  }

  const verified = await client.verify(subjects, tokensFromCookie.accessToken, {
    refresh: tokensFromCookie.refreshToken,
  });

  if ('err' in verified) {
    await deleteTokens();
    return Response.json(EMPTY_SESSION);
  }

  if (verified.tokens) {
    await setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  const accessToken = verified.tokens?.access ?? tokensFromCookie.accessToken;
  const user = await me({ accessToken }).catch(() => null);

  if (!user) {
    await deleteTokens();
    return Response.json(EMPTY_SESSION);
  }

  return Response.json({
    accessToken,
    user,
  });
}
