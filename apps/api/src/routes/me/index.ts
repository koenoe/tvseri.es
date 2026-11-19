import { vValidator } from '@hono/valibot-validator';
import { SCROBBLE_PROVIDERS } from '@tvseri.es/constants';
import {
  CountryCodeSchema,
  DeleteAccountSchema,
  SeriesStatesQuerySchema,
  UpdateUserSchema,
  UpdateWatchProvidersForUserSchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';
import { queueAccountDeletion } from '@/lib/account/queue';
import { invalidatePaths } from '@/lib/cdn';
import { getCircle } from '@/lib/circle';
import { getCirclePeople } from '@/lib/circlePeople';
import { getLibraryIds } from '@/lib/db/list';
import {
  clearDeletionRequested,
  markDeletionRequested,
  updateUser,
} from '@/lib/db/user';
import { deleteWebhookToken } from '@/lib/db/webhooks';
import { getGetStartedStatus } from '@/lib/getStarted';
import { getOverview } from '@/lib/overview';
import { readStartedIds } from '@/lib/rollups';
import { getSeriesStates } from '@/lib/seriesStates';
import { toWatchProvider } from '@/lib/watchProviders';
import { requireAuth, type Variables } from '@/middleware/auth';
import connections from './connections';
import exportRoutes from './export';
import home from './home';
import imports from './imports';
import ledger from './ledger';
import member from './member';
import person from './person';
import series from './series';

const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.get('/', async (c) => {
  const { user } = c.get('auth')!;
  return c.json(user);
});

// The viewer's show ids per list: one call for labels and `+` states. With
// `started`, so the page can hide "Seen it before?" before the first paint
// for a show the viewer took out of In progress, not only for listed ones.
app.get('/library-ids', async (c) => {
  const { user } = c.get('auth')!;
  const [library, started] = await Promise.all([
    getLibraryIds(user.id),
    readStartedIds(user.id),
  ]);
  return c.json({ ...library, started });
});

// The viewer's relationship with each asked show (the "+ Watchlist / Seen
// it" control): one call per page for every id with a control on it
app.get(
  '/series-states',
  vValidator('query', SeriesStatesQuerySchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const { ids } = c.req.valid('query');
    return c.json(await getSeriesStates(user.id, ids, Date.now()));
  },
);

const OverviewQuerySchema = v.object({
  region: v.optional(CountryCodeSchema),
  view: v.optional(v.picklist(['up-next'])),
});

// The profile page's trackers and calendar blocks. `?view=up-next`:
// Up next only (Home's Continue watching), without the watchlist, Waiting
// for and the tickets' TMDB lookups. `?region=`: the web's region (the
// saved country, else where the viewer is), for the tickets' services when
// no country is saved; the API only sees the web server's location
app.get('/overview', vValidator('query', OverviewQuerySchema), async (c) => {
  const { user } = c.get('auth')!;
  const { region, view } = c.req.valid('query');
  return c.json(
    await getOverview(user.id, user.country || region, Date.now(), {
      upNextOnly: view === 'up-next',
    }),
  );
});

// From your circle: unseen shows from the people you follow
app.get('/circle', async (c) => {
  const { user } = c.get('auth')!;
  const circle = await getCircle(user);
  return c.json(circle);
});

// The Circle page: your follows ranked by match, then the
// followers to follow back; one library read per person, no TMDB
app.get('/circle/people', async (c) => {
  const { user } = c.get('auth')!;
  const people = await getCirclePeople(user);
  return c.json(people);
});

// The Get started card's steps; stamps getStartedDoneAt once all done
app.get('/get-started', async (c) => {
  const { user } = c.get('auth')!;
  return c.json(await getGetStartedStatus(user, Date.now()));
});

app.delete('/', vValidator('json', DeleteAccountSchema), async (c) => {
  const { user } = c.get('auth')!;

  if (c.req.valid('json').confirm !== user.username) {
    throw new HTTPException(400, { message: 'Type your username to confirm' });
  }

  await markDeletionRequested(user.id, Date.now());
  try {
    // Media servers stop marking right away
    await Promise.all(
      SCROBBLE_PROVIDERS.map((type) =>
        deleteWebhookToken({ type, userId: user.id }),
      ),
    );
    await queueAccountDeletion(user.id);
  } catch (error) {
    // Signed out by the stamp but nothing queued: undo it so a retry works
    await clearDeletionRequested(user.id);
    throw error;
  }
  // The public profile and stats leave the CDN now, not when they expire
  await invalidatePaths([
    `/user/${user.id}/*`,
    `/user/by-username/${user.username}`,
  ]);

  return c.json({ status: 'queued' }, 202);
});

app.put('/', vValidator('json', UpdateUserSchema), async (c) => {
  const { user } = c.get('auth')!;
  const body = c.req.valid('json');

  try {
    const updatedUser = await updateUser(user, body);
    return c.json(updatedUser);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'UsernameAlreadyTaken') {
      throw new HTTPException(409, {
        message: 'UsernameAlreadyTaken',
      });
    }

    throw error;
  }
});

app.put(
  '/watch-providers',
  vValidator('json', UpdateWatchProvidersForUserSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const body = c.req.valid('json');

    const updatedUser = await updateUser(user, {
      watchProviders: body.watchProviders.map(toWatchProvider),
    });
    return c.json(updatedUser);
  },
);

app.route('/ledger', ledger);
app.route('/person', person);
app.route('/connections', connections);
app.route('/export', exportRoutes);
app.route('/home', home);
app.route('/imports', imports);
app.route('/member', member);
app.route('/series', series);

export default app;
