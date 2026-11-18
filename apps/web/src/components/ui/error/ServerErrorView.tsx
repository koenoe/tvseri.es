import type { ReactNode } from 'react';

import ErrorState from './ErrorState';
import HomeButton from './HomeButton';
import { SERVER_ERROR_STILL } from './stills';

/**
 * The 500: S05E00 · Something broke, Try again and Home, and the
 * Error ID (the server's `digest`) so a report can be matched to the log.
 *
 * @example
 * <ServerErrorView errorId={digest} header={<Header />} retry={<RetryButton onClick={tryAgain} />} />
 */
export default function ServerErrorView({
  errorId,
  header,
  retry,
}: Readonly<{ errorId?: string; header?: ReactNode; retry: ReactNode }>) {
  const actions = (
    <>
      {retry}
      <HomeButton />
    </>
  );
  const footnote = errorId
    ? `Error ID ${errorId} · quote it if you write to us`
    : undefined;
  return (
    <ErrorState
      actions={actions}
      body="Something broke on our side, not yours. Try again; if it keeps happening, we’re on it."
      code="S05E00"
      footnote={footnote}
      header={header}
      kicker="Something broke"
      still={SERVER_ERROR_STILL}
      title="“Have you tried turning it off and on again?”"
    />
  );
}
