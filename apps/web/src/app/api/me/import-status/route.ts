import { fetchMe } from '@/auth/me';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

import { ownPagesRoute, privateJson } from '../../handlers';

/**
 * The viewer's last import (`{ lastImport }`, null for none), polled by
 * Settings after Undo until `undoneAt` is set. Only that poll reads it, so an
 * undone import refreshes the viewer's stats once. A GET, not a server
 * action: Next runs a tab's actions one at a time, so a poll would hold up
 * every mark. 401 signed out or for a user the API doesn't know; an outage
 * is a 502, never "signed out".
 */
export const GET = ownPagesRoute(async (viewer) => {
  const user = await fetchMe(viewer.accessToken);
  if (!user) {
    return privateJson({ error: 'Unauthorized' }, 401);
  }
  if (user.lastImport?.undoneAt) {
    revalidateViewerStats(viewer.id);
  }
  return Response.json({ lastImport: user.lastImport ?? null });
});
