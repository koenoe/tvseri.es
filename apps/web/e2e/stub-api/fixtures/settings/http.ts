import type { IncomingHttpHeaders } from 'node:http';

import type { StubResponse } from '../../types.ts';
import { fail, isResponse, requireViewer } from '../show/http.ts';
import { type SettingsState, settingsOf } from './store.ts';

export type SettingsViewer = Readonly<{ id: string; state: SettingsState }>;

/**
 * `requireAuth` for the settings routes: the viewer behind the token and its
 * settings state. A viewer whose deletion was asked for is signed out (401),
 * as the API's auth middleware treats `deletionRequestedAt`.
 */
export const requireSettingsViewer = (
  headers: IncomingHttpHeaders,
): SettingsViewer | StubResponse => {
  const viewer = requireViewer(headers);
  if (isResponse(viewer)) {
    return viewer;
  }
  const state = settingsOf(viewer.id);
  if (!state) {
    return fail(401, 'Authentication required');
  }
  if (state.deletionRequestedAt) {
    return fail(401, 'AccountGone');
  }
  return { id: viewer.id, state };
};

export const isSettingsViewer = (
  value: SettingsViewer | StubResponse,
): value is SettingsViewer => 'state' in value;

/**
 * The API's auth middleware for every route: a token whose viewer asked for
 * deletion answers 401 `AccountGone`, whichever fixture serves the path.
 */
export const deletedViewerIntercept = (
  headers: IncomingHttpHeaders,
): StubResponse | undefined => {
  if (!headers.authorization) {
    return undefined;
  }
  const viewer = requireViewer(headers);
  if (isResponse(viewer)) {
    return undefined;
  }
  return settingsOf(viewer.id)?.deletionRequestedAt
    ? fail(401, 'AccountGone')
    : undefined;
};
