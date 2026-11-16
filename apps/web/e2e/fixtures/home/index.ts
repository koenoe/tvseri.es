import { HIDDEN_GEMS, TOP_PICKS, TRENDING } from './core.ts';
import { FEATURE_ROUTES } from './feature.ts';
import { MEMBER_LIBRARY, memberSpotlightLines } from './library.ts';
import { NEW_THIS_WEEK_ROUTES } from './newThisWeek.ts';
import { PERSONAL_ROUTES } from './personal.ts';
import { PREMIERES_ROUTES } from './premieres.ts';
import { ok, type StubRoute, type StubState } from './routes.ts';
import { TOY_ROUTES } from './toy.ts';
import { VIEWERS } from './viewer.ts';

export { viewerFromAuthorization } from './viewer.ts';
export type { StubState };

/**
 * Every route the home page reads, by path, but `/collection/top-rated`:
 * Discover's All-time favourites reads it too (`stub-api/fixtures/__top-rated.ts`)
 */
export const HOME_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/collection/most-popular-this-month': () => ok(TOP_PICKS),
  '/collection/trending': () => ok(TRENDING),
  '/home/hidden-gems': () => ok(HIDDEN_GEMS),
  '/me': (_url, _state, viewer) => {
    const user = VIEWERS.find((item) => item.key === viewer)?.user;
    return user ? ok(user) : { body: { message: 'Unauthorized' }, status: 401 };
  },
  '/me/home/spotlight-lines': (_url, _state, viewer) =>
    viewer === 'member'
      ? ok({ lines: memberSpotlightLines() })
      : viewer === 'new'
        ? ok({ lines: {} })
        : { body: { message: 'Unauthorized' }, status: 401 },
  '/me/library-ids': (_url, _state, viewer) =>
    viewer === 'member'
      ? ok(MEMBER_LIBRARY)
      : viewer === 'new'
        ? ok({ favorites: [], inProgress: [], watched: [], watchlist: [] })
        : { body: { message: 'Unauthorized' }, status: 401 },
  ...NEW_THIS_WEEK_ROUTES,
  ...PREMIERES_ROUTES,
  ...FEATURE_ROUTES,
  ...TOY_ROUTES,
  ...PERSONAL_ROUTES,
};

/**
 * Unset: the feature and the toy are the kinds the requested day's rotation
 * picks (`featureKindOfDay`, `toyKindOfDay`, as the API does), so the page's
 * placeholders, which follow the same rotation, are the loaded kind. A spec
 * that needs one kind posts it to `/__stub/state`.
 */
export const DEFAULT_STATE: StubState = {};
