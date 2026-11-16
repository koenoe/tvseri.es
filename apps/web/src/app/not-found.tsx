import Header from '@/components/header/Header';

import NotFoundContent from './_not-found/NotFoundContent';

/**
 * The 404 for a URL outside the `(site)` layout: it draws the site header
 * itself. A `notFound()` inside a site page is `(site)/not-found.tsx`.
 */
export default function NotFound() {
  return <NotFoundContent header={<Header />} />;
}
