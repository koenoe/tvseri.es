import { permanentRedirect } from 'next/navigation';

import NotFoundContent from '@/app/_not-found/NotFoundContent';
import DataDownView from '@/components/ui/error/DataDownView';
import { resolveEntityRoute } from '@/lib/routing/entityRoute';

import { PERSON_PAGE_ROUTE } from '../_data/route';
import { hasTvCredits } from '../_lib/tvCredits';
import PersonContent from './PersonContent';

type Params = Promise<{ id: string; slug?: string[] }>;

/**
 * Resolves the URL to a person (`resolveEntityRoute`, as the show page
 * does): the 404 view for a non-numeric, unknown or adult id; the data-down
 * page while the API is unavailable; the canonical URL for a missing or
 * stale slug; else the page. It renders after the static shell has
 * streamed, so the browser follows the redirect client-side (leading zeros
 * are the config 308 in `lib/routing/redirects.ts`). Person pages take no
 * query, so the redirect needs none.
 *
 * The 404 view is content, not `notFound()`, and the status comes from
 * `generateMetadata`, for the reason in the show page's `ShowRoute`.
 */
export default async function PersonRoute({
  params,
}: Readonly<{ params: Params }>) {
  const route = await resolveEntityRoute(await params, PERSON_PAGE_ROUTE);
  if (route.kind === 'not-found') {
    return <NotFoundContent />;
  }
  if (route.kind === 'unavailable') {
    return <DataDownView />;
  }
  if (route.kind === 'redirect') {
    permanentRedirect(route.path);
  }
  const { person, shows } = route.loaded;
  return <PersonContent person={person} tvCredits={hasTvCredits(shows)} />;
}
