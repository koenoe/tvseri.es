import { Suspense } from 'react';

import NotFoundContent from '@/app/_not-found/NotFoundContent';
import DataDownView from '@/components/ui/error/DataDownView';
import { resolveEntityRoute } from '@/lib/routing/entityRoute';
import { SHOW_ROUTE } from '../_data/route';
import CanonicalRedirect from './CanonicalRedirect';
import ShowContent from './ShowContent';
import ShowSkeleton from './ShowSkeleton';

type Params = Promise<{ id: string; slug?: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Resolves the URL to a show: the 404 view for a non-numeric id
 * (`/discover/x` reaches this route), an unknown or adult show; the data-down page while the
 * API is unavailable (no response, a timeout, a 5xx: cached for the
 * short `unavailable` life, as the person page does); the canonical URL for a
 * missing or stale slug; else the page. Leading zeros never get here: a config redirect
 * (`lib/routing/redirects.ts`) 308s them at the edge.
 *
 * The URL resolves as the person page's does (`resolveEntityRoute`). The
 * slug redirect renders inside Suspense and reads the query on that
 * branch; the canonical page reads it only in the episodes' viewer hole
 * (`?season`, already request time), so it stays a cached shell. The (site) App Shell is static (`ensureStatic`), so this is a
 * client-side redirect in the stream that keeps the query; the URL also
 * carries canonical + noindex metadata (`generateMetadata`).
 *
 * The 404 view renders here as content, not as `notFound()`: thrown inside
 * this Suspense boundary, React renders the boundary on the client, so the
 * HTML holds the show skeleton (grey ghosts) until the scripts swap in the
 * 404. The status comes from `generateMetadata`'s `notFound()`: a 404
 * wherever metadata is decided before the body (crawlers, the page's own
 * cached entry); a first visit streams after the shell, so it stays 200 with
 * `noindex`, as Next documents for streamed not-found.
 */
export default async function ShowRoute({
  params,
  searchParams,
}: Readonly<{ params: Params; searchParams: SearchParams }>) {
  const route = await resolveEntityRoute(await params, SHOW_ROUTE);
  if (route.kind === 'not-found') {
    return <NotFoundContent />;
  }
  if (route.kind === 'unavailable') {
    return <DataDownView />;
  }
  if (route.kind === 'redirect') {
    return (
      <Suspense fallback={<ShowSkeleton />}>
        <CanonicalRedirect path={route.path} searchParams={searchParams} />
      </Suspense>
    );
  }
  return <ShowContent query={searchParams} series={route.loaded} />;
}
