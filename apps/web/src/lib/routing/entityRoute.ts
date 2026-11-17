import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';
import getBaseUrl from '@/lib/getBaseUrl';

import { canonicalPath, toCanonicalId } from './canonical';

/**
 * The `[id]/[[...slug]]` pages (show, person) resolve their URL the same
 * way: an id that can't be one, an unknown or adult entity, the API down, a
 * non-canonical URL, or the page. Each route renders the answer itself.
 */

type Params = Readonly<{ id: string; slug?: ReadonlyArray<string> }>;

type Entity = Readonly<{ id: number; slug: string }>;

export type EntitySpec<L> = Readonly<{
  /** The cached read for an id: null when unknown or adult */
  load: (id: number) => Promise<L | null | Unavailable>;
  /** The id and slug the canonical URL is built from */
  entity: (loaded: L) => Entity;
  toPath: (id: number | string, slug?: string | null) => string;
}>;

export type EntityRoute<L> =
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'redirect'; loaded: L; path: string }>
  | Readonly<{ kind: 'ok'; loaded: L }>;

export async function resolveEntityRoute<L>(
  params: Params,
  { entity, load, toPath }: EntitySpec<L>,
): Promise<EntityRoute<L>> {
  const id = toCanonicalId(params.id);
  if (!id) {
    return { kind: 'not-found' };
  }
  const loaded = await load(Number(id));
  if (isUnavailable(loaded)) {
    return { kind: 'unavailable' };
  }
  if (loaded === null) {
    return { kind: 'not-found' };
  }
  const path = canonicalPath(params, entity(loaded), toPath);
  return path ? { kind: 'redirect', loaded, path } : { kind: 'ok', loaded };
}

/** What a page says about its entity; the rest of the metadata is shared */
type EntityMeta = Readonly<{
  title: string;
  description?: string;
  type: 'profile' | 'video.tv_show';
  image?: Readonly<{ alt: string; height: number; url: string; width: number }>;
}>;

/**
 * The page's metadata. An id that can't be one, or an unknown entity, is
 * the 404 status (`notFound()`: the view itself is the route's content; see
 * `ShowRoute`). While the API is down: none. A non-canonical URL redirects
 * in the page (in the stream, so client-side on a first visit): until then
 * it points crawlers at the canonical URL and isn't indexed.
 */
export async function entityMetadata<L>(
  params: Params,
  spec: EntitySpec<L>,
  meta: (loaded: L) => EntityMeta,
): Promise<Metadata> {
  const route = await resolveEntityRoute(params, spec);
  if (route.kind === 'not-found') {
    notFound();
  }
  if (route.kind === 'unavailable') {
    return {};
  }
  const { id, slug } = spec.entity(route.loaded);
  const url = `${getBaseUrl()}${spec.toPath(id, slug)}`;
  if (route.kind === 'redirect') {
    return { alternates: { canonical: url }, robots: { index: false } };
  }
  const { description, image, title, type } = meta(route.loaded);
  return {
    alternates: { canonical: url },
    description,
    openGraph: {
      description,
      images: image ? [image] : undefined,
      locale: 'en_GB',
      siteName: 'tvseri.es',
      title,
      type,
      url,
    },
    title,
  };
}
