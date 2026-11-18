import { vValidator } from '@hono/valibot-validator';
import { FEATURE_KINDS, TOY_KINDS } from '@tvseri.es/utils';
import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';
import { fetchConnectedFrom } from '@/lib/home/connectedFrom';
import { fetchFeatureOfTheDay } from '@/lib/home/feature';
import { fetchHiddenGems } from '@/lib/home/hiddenGems';
import { fetchNewThisWeekWithStatus } from '@/lib/home/newThisWeek';
import { fetchToyOfTheDay } from '@/lib/home/toy';
import { cacheHeader, dayBuildCacheControl } from '@/utils/cacheHeader';
import { DayQuerySchema, WeekQuerySchema } from '@/utils/dayParam';
import { NumericIdSchema } from '@/utils/params';

// `?kind=` builds that kind alone, never another (the web's /dev/home
// preview of every kind with real data); same day window as the default
const FeatureQuerySchema = v.object({
  ...DayQuerySchema.entries,
  kind: v.optional(v.picklist(FEATURE_KINDS)),
});
const ToyQuerySchema = v.object({
  ...DayQuerySchema.entries,
  kind: v.optional(v.picklist(TOY_KINDS)),
});

// The start show of Connected by's paths
const ConnectedQuerySchema = v.object({
  ...DayQuerySchema.entries,
  from: NumericIdSchema,
});

const app = new Hono();

/**
 * Answers with a day build that may have nothing to show: a 404 the CDN
 * keeps when there is nothing, a 503 (retryable, never cached) when there is
 * nothing because lookups failed
 */
const sendDayBuild = (
  c: Context,
  date: string,
  {
    partial,
    result,
  }: Readonly<{
    partial: boolean;
    result: Readonly<{ date: string }> | undefined;
  }>,
) => {
  if (!result) {
    if (partial) {
      throw new HTTPException(503, { message: 'Try again shortly' });
    }
    c.header('Cache-Control', cacheHeader('medium'));
    return c.notFound();
  }

  // A stand-in (yesterday's build) for 30 s, an incomplete one for an hour
  c.header('Cache-Control', dayBuildCacheControl(date, result, partial));
  return c.json(result);
};

// The same for everyone on a given day; the date is in the URL so it caches
app.get('/feature', vValidator('query', FeatureQuerySchema), async (c) => {
  const { date, kind } = c.req.valid('query');
  return sendDayBuild(c, date, await fetchFeatureOfTheDay(date, kind));
});

app.get('/toy', vValidator('query', ToyQuerySchema), async (c) => {
  const { date, kind } = c.req.valid('query');
  return sendDayBuild(c, date, await fetchToyOfTheDay(date, kind));
});

// Connected by's two-step paths from one show, the same for everyone that
// day (the web leaves out what a viewer has seen); built once per show and
// day, so the show and the date are in the URL and it caches
app.get('/connected', vValidator('query', ConnectedQuerySchema), async (c) => {
  const { date, from } = c.req.valid('query');
  return sendDayBuild(c, date, await fetchConnectedFrom(from, date));
});

// The week's Hidden gems, the same for everyone that week; the week is in the
// URL so it caches. A failed TMDB read throws (a 5xx, never cached).
app.get('/hidden-gems', vValidator('query', WeekQuerySchema), async (c) => {
  const items = await fetchHiddenGems(c.req.valid('query').week);
  c.header('Cache-Control', cacheHeader('medium'));
  return c.json(items);
});

// What premiered in the week up to the date, the same for everyone that day;
// yesterday's list stands in (short-cached) while today's can't be built
app.get('/new-this-week', vValidator('query', DayQuerySchema), async (c) => {
  const { date } = c.req.valid('query');
  const { partial, result } = await fetchNewThisWeekWithStatus(date);

  // A stand-in (yesterday's build) for 30 s, an incomplete one for an hour
  c.header('Cache-Control', dayBuildCacheControl(date, result, partial));
  return c.json(result);
});

export default app;
