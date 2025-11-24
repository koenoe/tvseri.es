import { vValidator } from '@hono/valibot-validator';
import {
  AuthenticateWithOTPSchema,
  AuthenticateWithTmdbSchema,
  CreateOTPSchema,
  CreateTmdbRequestTokenSchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { createOTP, validateOTP } from '@/lib/db/otp';
import { createSession, deleteSession } from '@/lib/db/session';
import { createUser, findUser } from '@/lib/db/user';
import {
  createAccessToken,
  createRequestToken,
  createSessionId,
  deleteAccessToken,
  deleteSessionId,
  fetchAccountDetails,
} from '@/lib/tmdb';
import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.post('/otp/create', vValidator('json', CreateOTPSchema), async (c) => {
  const { email } = c.req.valid('json');
  const otp = await createOTP({ email });

  return c.json({ otp }, 201);
});

app.post('/otp', vValidator('json', AuthenticateWithOTPSchema), async (c) => {
  const { email, otp, clientIp, city, country, userAgent, region } =
    c.req.valid('json');
  const isValid = await validateOTP({ email, otp });

  if (!isValid) {
    throw new HTTPException(401, {
      message: 'Invalid OTP',
    });
  }

  let user = await findUser({ email });
  if (!user) {
    user = await createUser({
      email,
    });
  }

  const sessionId = await createSession({
    city,
    clientIp,
    country,
    region,
    userAgent,
    userId: user.id,
  });

  return c.json({ sessionId }, 201);
});

app.post(
  '/tmdb/create-request-token',
  vValidator('json', CreateTmdbRequestTokenSchema),
  async (c) => {
    const { redirectUri } = c.req.valid('json');
    const token = await createRequestToken(redirectUri);

    return c.json({ token }, 201);
  },
);

app.post('/tmdb', vValidator('json', AuthenticateWithTmdbSchema), async (c) => {
  const { requestToken, clientIp, city, country, userAgent, region } =
    c.req.valid('json');

  const { accessToken, accountObjectId } =
    await createAccessToken(requestToken);

  if (!accessToken) {
    throw new HTTPException(401, {
      message: 'Invalid request token from TMDb',
    });
  }

  const tmdbSessionId = await createSessionId(accessToken);
  if (!tmdbSessionId) {
    throw new HTTPException(500, {
      message: 'Failed to fetch access token from TMDb',
    });
  }

  const tmdbAccount = await fetchAccountDetails(tmdbSessionId);
  if (!tmdbAccount) {
    throw new HTTPException(500, {
      message: 'Failed to fetch account details from TMDb',
    });
  }

  let user = await findUser({ tmdbAccountId: tmdbAccount.id });
  if (!user) {
    user = await createUser({
      name: tmdbAccount.name,
      tmdbAccountId: tmdbAccount.id,
      tmdbAccountObjectId: accountObjectId,
      tmdbUsername: tmdbAccount.username,
      username: tmdbAccount.username,
    });
  }

  const sessionId = await createSession({
    city,
    clientIp,
    country,
    region,
    tmdbAccessToken: accessToken,
    tmdbSessionId,
    userAgent,
    userId: user.id,
  });

  return c.json({ sessionId }, 201);
});

app.delete('/', requireAuth(), async (c) => {
  const { session } = c.get('auth')!;

  await deleteSession(session.id);

  // Note: delete the session from TMDB
  if (session.tmdbSessionId && session.tmdbAccessToken) {
    await Promise.all([
      deleteAccessToken(session.tmdbAccessToken),
      deleteSessionId(session.tmdbSessionId),
    ]);
  }

  return c.json({ success: true });
});

export default app;
