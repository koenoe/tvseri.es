import {
  DEFAULT_STATE,
  HOME_ROUTES,
  type StubState,
  viewerFromAuthorization,
} from '../../fixtures/home/index.ts';
import type { StubRoute } from '../types';

/**
 * Home: its fixture shows, served from `e2e/fixtures/home`. Home's trending
 * ten (with backdrops and logos for the spotlight) also answer
 * `/collection/trending` for the 404's posters. The day's moments
 * switch with `STUB_HOME_FEATURE` / `STUB_HOME_TOY` at start or
 * `POST /__stub/state` `{ "feature": "binge", "toy": "whats-on" }` (send the
 * `x-api-key: stub` header); `GET` reads it.
 */
const fromEnv = (name: string) => process.env[name] || undefined;

/**
 * The day's kinds at start: `STUB_HOME_FEATURE` (binge, stills, archive,
 * did-you-know, countdown) and `STUB_HOME_TOY` (whats-on, connected-by,
 * where-set) pick one for a whole run, so every kind can be rendered
 * without waiting for its day; unset, the day's rotation decides.
 */
let state: StubState = {
  ...DEFAULT_STATE,
  ...(fromEnv('STUB_HOME_FEATURE') && {
    feature: fromEnv('STUB_HOME_FEATURE'),
  }),
  ...(fromEnv('STUB_HOME_TOY') && { toy: fromEnv('STUB_HOME_TOY') }),
};

const STATE_PATH = '/__stub/state';

export const routes: readonly StubRoute[] = [
  { handle: () => ({ body: state }), path: STATE_PATH },
  {
    handle: ({ body }) => {
      state = { ...state, ...(body as Partial<StubState>) };
      return { body: state };
    },
    method: 'POST',
    path: STATE_PATH,
  },
  ...Object.entries(HOME_ROUTES).map(
    ([path, route]): StubRoute => ({
      handle: ({ headers, path: pathname, query }) => {
        const url = new URL(`http://stub${pathname}?${query.toString()}`);
        const viewer = viewerFromAuthorization(headers.authorization)?.key;
        // A signed-in viewer of another area's fixtures (settings, show):
        // let their own `/me…` routes answer. If you liked X is Home's
        // alone and the same for everyone, so it answers them too.
        if (
          !viewer &&
          headers.authorization &&
          path.startsWith('/me') &&
          path !== '/me/home/if-you-liked'
        ) {
          return undefined;
        }
        const reply = route(url, state, viewer);
        return { body: reply.body, status: reply.status };
      },
      path,
    }),
  ),
];
