import UnauthorizedForPath from '../_unauthorized/UnauthorizedForPath';

/**
 * 401 for `unauthorized()` inside a site page: the `(site)`
 * layout already draws the site header, so the view draws none.
 */
export default function SiteUnauthorized() {
  return <UnauthorizedForPath />;
}
