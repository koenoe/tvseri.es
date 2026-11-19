import type { ConnectionService } from '@tvseri.es/schemas';

import { connectedService } from '../../_lib/services';
import AppHeaderGhost, { APP_CARD_GHOST_CLASS } from './AppHeaderGhost';

/**
 * A service card while its status loads: the header only, since the card
 * starts closed. The status line is a ghost, not "Not connected": the
 * state is what's loading. Inert.
 */
export default function ServiceSkeleton({
  service,
}: Readonly<{ service: ConnectionService }>) {
  const { facts, name } = connectedService(service);
  const pills = ['Available', ...facts];
  return (
    <div aria-hidden="true" inert>
      <div className={APP_CARD_GHOST_CLASS}>
        <AppHeaderGhost name={name} pills={pills} toggle="Open" />
      </div>
    </div>
  );
}
