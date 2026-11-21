import type { ReactNode } from 'react';

import ErrorState from './ErrorState';
import HomeButton from './HomeButton';
import NotFoundPosters from './NotFoundPosters';
import NotFoundSearch from './NotFoundSearch';
import type { NotFoundShow } from './notFoundShow';
import PickOneButton from './PickOneButton';
import type { NotFoundStill } from './stills';

/** The body offers the pick only beside its button */
const BODY = 'The link is broken, or the page has gone. Search for it.';
const BODY_WITH_PICK =
  'The link is broken, or the page has gone. Search for it, or let us pick a series for you.';

/**
 * The 404: S04E04 · Page not found, the still's own headline, a search field
 * prefilled from the URL, Pick one for me, Home and five trending posters new
 * to the viewer. Without trending shows (the API is down) the pick, the
 * posters and the sentence that offers the pick are left out: no error
 * inside the error page.
 *
 * @example
 * <NotFoundView header={<Header />} shows={await loadTrending()} still={still} />
 */
export default function NotFoundView({
  header,
  shows = [],
  still,
}: Readonly<{
  header?: ReactNode;
  /** The trending pool: the first five are drawn, Pick one draws from all. */
  shows?: ReadonlyArray<NotFoundShow>;
  still: NotFoundStill;
}>) {
  // the same array as the posters' pool, so the payload carries it once
  const actions = (
    <>
      {shows.length > 0 ? <PickOneButton shows={shows} /> : null}
      <HomeButton />
    </>
  );
  const discovery =
    shows.length > 0 ? <NotFoundPosters pool={shows} /> : undefined;
  const body = shows.length > 0 ? BODY_WITH_PICK : BODY;
  return (
    <ErrorState
      actions={actions}
      body={body}
      code="S04E04"
      discovery={discovery}
      header={header}
      kicker="Page not found"
      search={<NotFoundSearch />}
      still={still}
      title={still.headline}
    />
  );
}
