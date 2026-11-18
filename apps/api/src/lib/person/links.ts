import type { PersonLink, PersonLinkType } from '@tvseri.es/schemas';

export type TmdbPersonExternalIds = Readonly<{
  imdb_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  tiktok_id?: string | null;
  youtube_id?: unknown;
  wikidata_id?: string | null;
}>;

// Ids end up inside URLs: only plain handle characters pass
const SAFE_ID = /^[\w.-]+$/;

const SOURCES: ReadonlyArray<
  readonly [
    type: PersonLinkType,
    key: keyof TmdbPersonExternalIds,
    url: (id: string) => string,
  ]
> = [
  ['imdb', 'imdb_id', (id) => `https://www.imdb.com/name/${id}/`],
  ['instagram', 'instagram_id', (id) => `https://www.instagram.com/${id}/`],
  ['x', 'twitter_id', (id) => `https://x.com/${id}`],
  ['tiktok', 'tiktok_id', (id) => `https://www.tiktok.com/@${id}`],
  ['youtube', 'youtube_id', (id) => `https://www.youtube.com/@${id}`],
  ['wikidata', 'wikidata_id', (id) => `https://www.wikidata.org/wiki/${id}`],
];

export const toPersonLinks = (
  ids: TmdbPersonExternalIds,
): ReadonlyArray<PersonLink> =>
  SOURCES.flatMap(([type, key, url]) => {
    const id = ids[key];
    return typeof id === 'string' && SAFE_ID.test(id)
      ? [{ id, type, url: url(id) }]
      : [];
  });
