import { fetchLibraryIds } from '@/lib/marking/server/api';

import { viewerRoute } from '../../handlers';

/**
 * The viewer's show ids per list: one client call after hydration gives
 * every Watched label, In progress state and `+` on cached pages
 * (`useLibraryIds`). The proxy answers 401 signed out; a deleted user's
 * `AccountGone` passes through, so the browser forgets it (`forgetViewer`).
 */
export const GET = viewerRoute(async (viewer) =>
  Response.json(await fetchLibraryIds(viewer.accessToken)),
);
