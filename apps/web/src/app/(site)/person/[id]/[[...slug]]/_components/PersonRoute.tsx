import { permanentRedirect } from 'next/navigation';

import NotFoundContent from '@/app/_not-found/NotFoundContent';
import DataDownView from '@/components/ui/error/DataDownView';
import { isUnavailable } from '@/lib/cache/unavailable';
import { canonicalPath, toCanonicalId } from '@/lib/routing/canonical';
import personPath from '@/lib/routing/personPath';

import { loadPerson, loadShows } from '../_data/loaders';
import { hasTvCredits } from '../_lib/tvCredits';
import PersonContent from './PersonContent';

type Params = Promise<{ id: string; slug?: string[] }>;

/**
 * Resolves the URL to a person: the 404 view for a non-numeric, unknown or
 * adult id; the data-down page while the API is unavailable; a 308 to the
 * canonical URL for leading zeros or a missing or stale slug; else the
 * page. Person pages take no query, so the redirect needs none.
 *
 * The 404 view is content, not `notFound()`, and the status comes from
 * `generateMetadata`, for the reason in the show page's `ShowRoute`.
 */
export default async function PersonRoute({
  params,
}: Readonly<{ params: Params }>) {
  const resolved = await params;
  const id = toCanonicalId(resolved.id);
  if (!id) {
    return <NotFoundContent />;
  }
  // The credits come with the person (the same cached read Known for, Career
  // and Shows use): a person without TV credits gets no placeholders for
  // the sections that would stay empty, so nothing collapses under them
  const [result, shows] = await Promise.all([
    loadPerson(Number(id)),
    loadShows(Number(id)),
  ]);
  if (isUnavailable(result)) {
    return <DataDownView />;
  }
  if (result.status === 'not-found') {
    return <NotFoundContent />;
  }
  const { person } = result;
  const redirectPath = canonicalPath(resolved, person, personPath);
  if (redirectPath) {
    permanentRedirect(redirectPath);
  }
  return <PersonContent person={person} tvCredits={hasTvCredits(shows)} />;
}
