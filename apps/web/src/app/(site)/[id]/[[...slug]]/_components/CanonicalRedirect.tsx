import { permanentRedirect } from 'next/navigation';

import { toQuerySuffix } from '../_lib/canonical';

/**
 * Redirects to the canonical URL, keeping the query (`?season=2&episode=6`).
 * It renders after the static shell has streamed, so the browser follows it
 * client-side (not an HTTP 308; leading zeros are the config 308 in
 * `lib/routing/redirects.ts`). Reads `searchParams`, so it renders only on a
 * non-canonical URL, inside Suspense: the canonical page never touches the
 * query and stays static.
 */
export default async function CanonicalRedirect({
  path,
  searchParams,
}: Readonly<{
  path: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>): Promise<never> {
  return permanentRedirect(`${path}${toQuerySuffix(await searchParams)}`);
}
