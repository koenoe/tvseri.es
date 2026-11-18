import type { ReactNode } from 'react';

import ErrorState from './ErrorState';
import { TEST_CARD } from './stills';

/**
 * Offline: “You’re off air.” on the CSS test card (the still
 * couldn't load), with Try again. The error boundary also retries by itself
 * when the browser is back online.
 */
export default function OfflineView({
  header,
  retry,
}: Readonly<{ header?: ReactNode; retry: ReactNode }>) {
  return (
    <ErrorState
      actions={retry}
      body="No connection right now. Pages you opened before may still work, and this one retries when you’re back."
      code="Off air"
      header={header}
      kicker="You’re offline"
      still={TEST_CARD}
      title="You’re off air."
    />
  );
}
