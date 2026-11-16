import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import DataDownView from '@/components/ui/error/DataDownView';
import { isUnavailable } from '@/lib/cache/unavailable';
import { canonicalPath, toCanonicalId } from '@/lib/routing/canonical';
import showPath from '@/lib/routing/showPath';
import { loadShow } from '../_data/loaders';
import CanonicalRedirect from './CanonicalRedirect';
import ShowContent from './ShowContent';
import ShowSkeleton from './ShowSkeleton';

type Params = Promise<{ id: string; slug?: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Resolves the URL to a show: 404 for a non-numeric id (`/discover/x` reaches
 * this route), an unknown or adult show; the data-down page while the
 * API is unavailable (no response, a timeout, a 5xx: cached for the
 * short `unavailable` life, as the person page does); the canonical URL for a
 * missing or stale slug; else the page. Leading zeros never get here: a config redirect
 * (`lib/routing/redirects.ts`) 308s them at the edge.
 *
 * The slug redirect renders inside Suspense and reads the query on that
 * branch; the canonical page reads it only in the episodes' viewer hole
 * (`?season`, already request time), so it stays a cached shell. The (site) App Shell is static (`ensureStatic`), so this is a
 * client-side redirect in the stream that keeps the query; the URL also
 * carries canonical + noindex metadata (`generateMetadata`).
 */
export default async function ShowRoute({
  params,
  searchParams,
}: Readonly<{ params: Params; searchParams: SearchParams }>) {
  const resolved = await params;
  const id = toCanonicalId(resolved.id);
  if (!id) {
    notFound();
  }
  const show = await loadShow(Number(id));
  if (isUnavailable(show)) {
    return <DataDownView />;
  }
  if (show.status === 'not-found') {
    notFound();
  }
  const { series } = show;
  const redirectPath = canonicalPath(resolved, series, showPath);
  if (redirectPath) {
    return (
      <Suspense fallback={<ShowSkeleton />}>
        <CanonicalRedirect path={redirectPath} searchParams={searchParams} />
      </Suspense>
    );
  }
  return <ShowContent query={searchParams} series={series} />;
}
