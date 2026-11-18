import type { StubRoute } from '../types.ts';
import { deletedViewerIntercept } from './settings/http.ts';
import { ACCOUNT_ROUTES } from './settings.ts';

/**
 * Sorts before `__profile.ts`: the viewer's `GET`/`PUT /me`, services and
 * the region's services come from the settings store (profile edits,
 * `lastImport`), seeded from the profile fixtures' people (same ids).
 */
export const routes = ACCOUNT_ROUTES;

/** Sorts first: a deleted viewer's token is refused on every route (`AccountGone`). */
export const intercept: StubRoute['handle'] = ({ headers }) =>
  deletedViewerIntercept(headers);
