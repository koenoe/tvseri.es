import type { ReactNode } from 'react';

import ErrorState from './ErrorState';
import HomeButton from './HomeButton';
import { FORBIDDEN_STILL } from './stills';

/**
 * The 403: S04E03 · Not for you, and Home.
 * `forbidden()` renders it through `app/forbidden.tsx`.
 */
export default function ForbiddenView({
  header,
}: Readonly<{ header?: ReactNode }>) {
  const actions = <HomeButton />;
  return (
    <ErrorState
      actions={actions}
      body="It’s for admins only. Everything else is open to you."
      code="S04E03"
      header={header}
      kicker="Not for you"
      still={FORBIDDEN_STILL}
      title="This one isn’t yours to open."
    />
  );
}
