import type { ReactNode } from 'react';

import ErrorState from './ErrorState';
import HomeButton from './HomeButton';
import RefreshButton from './RefreshButton';
import { DATA_DOWN_STILL } from './stills';

/**
 * Data down: the API or TMDB isn't answering. S05E03 · Can’t
 * load shows, Try again and Home. Error boundaries pick it for a
 * `DataDownError`; a page can also render it itself, and
 * Try again then refreshes the route.
 *
 * @example
 * <DataDownView header={<Header />} />
 */
export default function DataDownView({
  header,
  retry = <RefreshButton />,
}: Readonly<{ header?: ReactNode; retry?: ReactNode }>) {
  const actions = (
    <>
      {retry}
      <HomeButton />
    </>
  );
  return (
    <ErrorState
      actions={actions}
      body="TMDB, where our series info comes from, isn’t answering. Your watch history is safe. Try again in a minute."
      code="S05E03"
      header={header}
      kicker="Can’t load series"
      still={DATA_DOWN_STILL}
      title="Our series data is on a break."
    />
  );
}
