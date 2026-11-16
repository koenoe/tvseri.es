import Header from '@/components/header/Header';

import UnauthorizedForPath from './_unauthorized/UnauthorizedForPath';

/**
 * 401 for every `unauthorized()` call: signed-out visitors on a
 * profile page and anything else that needs a session.
 */
export default function Unauthorized() {
  return <UnauthorizedForPath header={<Header />} />;
}
