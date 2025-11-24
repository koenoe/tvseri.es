import { vValidator } from '@hono/valibot-validator';
import {
  AddTmdbToUserSchema,
  UpdateUserSchema,
  UpdateWatchProvidersForUserSchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { addTmdbToSession, removeTmdbFromSessions } from '@/lib/db/session';
import {
  addTmdbToUser,
  findUser,
  removeTmdbFromUser,
  updateUser,
} from '@/lib/db/user';
import {
  createAccessToken,
  createSessionId,
  deleteAccessToken,
  deleteSessionId,
  fetchAccountDetails,
} from '@/lib/tmdb';
import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.get('/', async (c) => {
  const auth = c.get('auth');
  return c.json(auth);
});

app.put('/', vValidator('json', UpdateUserSchema), async (c) => {
  const { user } = c.get('auth')!;
  const body = c.req.valid('json');

  try {
    const updatedUser = await updateUser(user, body);
    return c.json(updatedUser);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'EmailAlreadyTaken') {
      throw new HTTPException(409, {
        message: 'EmailAlreadyTaken',
      });
    } else if (error.message === 'UsernameAlreadyTaken') {
      throw new HTTPException(409, {
        message: 'UsernameAlreadyTaken',
      });
    }

    throw error;
  }
});

app.put('/tmdb', vValidator('json', AddTmdbToUserSchema), async (c) => {
  const { user: userFromSession, session } = c.get('auth')!;
  const { requestToken } = c.req.valid('json');

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

  const user = await findUser({ tmdbAccountId: tmdbAccount.id });
  if (user) {
    throw new HTTPException(409, {
      message: 'Your TMDb account is already linked.',
    });
  }

  await Promise.all([
    addTmdbToSession(session, {
      tmdbAccessToken: accessToken,
      tmdbSessionId,
    }),
    addTmdbToUser(userFromSession, {
      tmdbAccountId: tmdbAccount.id,
      tmdbAccountObjectId: accountObjectId,
      tmdbUsername: tmdbAccount.username,
    }),
  ]);

  return c.json({ message: 'OK' });
});

app.delete('/tmdb', async (c) => {
  const { user } = c.get('auth')!;
  const isTmdbUser =
    user.tmdbAccountId && user.tmdbAccountObjectId && user.tmdbUsername;
  const promises = [];

  if (isTmdbUser) {
    promises.push(removeTmdbFromUser(user));
  }

  const tmdbSessionsToCleanup = await removeTmdbFromSessions(user.id);
  const tmdbCleanupPromises = tmdbSessionsToCleanup.flatMap((session) => {
    const p = [];
    if (session.accessToken) {
      p.push(deleteAccessToken(session.accessToken));
    }
    if (session.sessionId) {
      p.push(deleteSessionId(session.sessionId));
    }
    return p;
  });

  promises.push(...tmdbCleanupPromises);

  await Promise.all(promises);

  return c.json({ message: 'OK' });
});

app.put(
  '/watch-providers',
  vValidator('json', UpdateWatchProvidersForUserSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const body = c.req.valid('json');

    const updatedUser = await updateUser(user, body);
    return c.json(updatedUser);
  },
);

export default app;
