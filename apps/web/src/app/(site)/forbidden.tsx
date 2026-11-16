import ForbiddenView from '@/components/ui/error/ForbiddenView';

/**
 * 403 (ERFinal) for `forbidden()` inside a site page: the `(site)` layout
 * already draws the site header, so the view draws none.
 */
export default function SiteForbidden() {
  return <ForbiddenView />;
}
