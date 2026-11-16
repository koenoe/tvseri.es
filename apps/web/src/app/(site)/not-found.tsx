import NotFoundContent from '../_not-found/NotFoundContent';

/**
 * The 404 for a `notFound()` inside a site page: the `(site)` layout around
 * it already draws the site header, so the view draws none (one header).
 */
export default function SiteNotFound() {
  return <NotFoundContent />;
}
