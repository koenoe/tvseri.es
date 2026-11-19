import type {
  SharedShow,
  TasteMatchResponse,
  TasteShow,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { isFollowing } from '@/lib/db/follow';
import { getLibraryIds } from '@/lib/db/list';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { sharedShowFacts } from '@/lib/sharedShow';
import {
  computeTaste,
  newToViewerPicks,
  sharedShowLine,
  toTasteShow,
} from '@/lib/tasteMatch';
import { getRecentLibraryIds, tasteSplit } from '@/lib/tasteSplit';
import { requireAuth } from '@/middleware/auth';
import { PRIVATE_NO_STORE } from '@/utils/cacheHeader';

import { type UserVariables, user } from './middleware';

const app = new Hono<{ Variables: UserVariables }>();

// Shows named by the match card and the New to you picks (You both watch
// draws 4, the card names 3)
const SHARED_SHOWS = 6;
const NEW_TO_YOU = 6;

// The visitor's view of another profile: the taste match, what is new
// to the viewer, where the tastes split, and the follow flags. Signed-in
// viewers only.
app.get('/:id/match', user(), requireAuth(), async (c) => {
  const { user: viewer } = c.get('auth')!;
  const owner = c.get('user');

  if (owner.id === viewer.id) {
    throw new HTTPException(400, { message: 'No match with yourself' });
  }

  const [
    viewerLibrary,
    ownerLibrary,
    followsYou,
    following,
    viewerSample,
    ownerSample,
  ] = await Promise.all([
    getLibraryIds(viewer.id),
    getLibraryIds(owner.id),
    isFollowing({ targetUserId: viewer.id, userId: owner.id }),
    isFollowing({ targetUserId: owner.id, userId: viewer.id }),
    getRecentLibraryIds(viewer.id),
    getRecentLibraryIds(owner.id),
  ]);

  const taste = computeTaste(viewerLibrary, ownerLibrary);
  const shared = taste.sharedShows.slice(0, SHARED_SHOWS);
  const picks = newToViewerPicks(viewerLibrary, ownerLibrary).slice(
    0,
    NEW_TO_YOU,
  );
  const facts = await getSeriesFacts([
    ...shared.map((show) => show.id),
    ...picks.map((pick) => pick.id),
    ...viewerSample,
    ...ownerSample,
  ]);
  const split = await tasteSplit(ownerSample, viewerSample, facts);

  const now = Date.now();
  const sharedShows = shared.flatMap(({ id, relation }): SharedShow[] => {
    const showFacts = facts.get(id);
    const show = toTasteShow(id, showFacts);
    if (!show || !showFacts) {
      return [];
    }
    const { lastAiredSeason, next } = sharedShowFacts(showFacts, now);
    return [
      {
        ...show,
        ...sharedShowLine(showFacts),
        finishedSeason: relation === 'both-finished' ? lastAiredSeason : null,
        next,
        relation,
      },
    ];
  });
  const newToYou = picks.flatMap(({ id, reason }): TasteShow[] => {
    const show = toTasteShow(id, facts.get(id));
    return show ? [{ ...show, reason }] : [];
  });

  c.header('Cache-Control', PRIVATE_NO_STORE);

  return c.json({
    following,
    followsYou,
    match: {
      level: taste.level,
      notEnough: taste.level === null,
      sharedCount: taste.sharedCount,
      sharedShows,
    },
    newToYou,
    split,
  } satisfies TasteMatchResponse);
});

export default app;
