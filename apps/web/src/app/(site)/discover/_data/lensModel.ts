import { hasEnoughPosters } from '@tvseri.es/constants';
import { DURATION_BUCKETS, type DurationBucket } from '@tvseri.es/schemas';
import { buildBackdropImageUrl, buildPosterImageUrl } from '@tvseri.es/utils';
import { pluralCapped } from '@/lib/format/text';
import type {
  CountSource,
  DecadeTileEntry,
  DurationTileEntry,
  LinkTileEntry,
  TileDress,
} from './hubTiles';

/**
 * A network's wordmark (TMDB's logo), its width / height, and whether it
 * can be drawn white (false: on a light chip, `NetworkWordmark`)
 */
export type TileWordmark = Readonly<{
  src: string;
  ratio: number;
  silhouette: boolean;
}>;

/** What a lens tile draws: name, one meta line, its dress, and what it does */
export type LensTileView = Readonly<{
  key: string;
  name: string;
  /** a network tile's wordmark, drawn white in the name's place (the name stays its label) */
  wordmark?: TileWordmark;
  line: string;
  /** "6 to 10 hours" is a length (clock); every other line is a count of shows (layers) */
  lineGlyph: 'clock' | 'layers';
  look:
    | Readonly<{ kind: 'backdrop'; image: string | null; position: string }>
    | Readonly<{ kind: 'deck'; posters: ReadonlyArray<string | null> }>
    | Readonly<{ kind: 'calm' }>;
  /** a link to a landing, or opens its row in place (`open`: the row's key) */
  action:
    | Readonly<{ kind: 'link'; href: string }>
    | Readonly<{ kind: 'open'; row: string }>;
}>;

export type Art = Readonly<{
  backdrop: string | null;
  poster: string | null;
}>;

const LENGTH_LINE = /^\d+ to \d+ hours$/;

export const lineGlyphOf = (line: string): LensTileView['lineGlyph'] =>
  LENGTH_LINE.test(line) ? 'clock' : 'layers';

/** The key a count is stored under: `country:gb`, `query:with_origin_country=DK|SE` */
export const countKey = (source: CountSource): string =>
  'query' in source ? `query:${source.query}` : `${source.type}:${source.slug}`;

/** A hand-picked dress: its stored TMDB paths, at the API's default sizes */
const lookOf = (dress: TileDress): LensTileView['look'] => {
  switch (dress.kind) {
    case 'backdrop':
      return {
        image: buildBackdropImageUrl(dress.show.backdrop),
        kind: 'backdrop',
        position: dress.position ?? 'center',
      };
    case 'deck':
      return {
        kind: 'deck',
        posters: dress.shows.map((show) => buildPosterImageUrl(show.poster)),
      };
    default:
      return { kind: 'calm' };
  }
};

const countLine = (count: number | undefined, noun = 'series') =>
  count === undefined ? '' : pluralCapped(count, noun, noun);

/** The network slug of a tile that is one network (its count is the network's), so it can draw its wordmark */
export const wordmarkNetwork = (entry: LinkTileEntry): string | undefined =>
  entry.count && 'type' in entry.count && entry.count.type === 'network'
    ? entry.count.slug
    : undefined;

/**
 * Country, Language, Network and Theme: every tile opens its landing; a
 * network's tile draws its wordmark where `wordmarks` (by `href`) has one
 */
export const buildLinkTiles = (
  entries: ReadonlyArray<LinkTileEntry>,
  counts: ReadonlyMap<string, number>,
  wordmarks: ReadonlyMap<string, TileWordmark> = new Map(),
): ReadonlyArray<LensTileView> =>
  entries.map((entry) => {
    const line =
      entry.line ??
      (entry.count ? countLine(counts.get(countKey(entry.count))) : '');
    const wordmark = wordmarks.get(entry.href);
    return {
      action: { href: entry.href, kind: 'link' },
      key: entry.href,
      line,
      lineGlyph: lineGlyphOf(line),
      look: lookOf(entry.dress),
      name: entry.name,
      ...(wordmark ? { wordmark } : {}),
    };
  });

/** Decades open their row in place; "Before 1990" shows its count */
export const buildDecadeTiles = (
  entries: ReadonlyArray<DecadeTileEntry>,
  before1990: number | undefined,
): ReadonlyArray<LensTileView> =>
  entries.map((entry) => {
    const line = entry.line ?? countLine(before1990);
    return {
      action: { kind: 'open', row: decadeRowKey(entry) },
      key: decadeRowKey(entry),
      line,
      lineGlyph: lineGlyphOf(line),
      look: lookOf(entry.dress),
      name: entry.name,
    };
  });

export const decadeRowKey = (entry: DecadeTileEntry): string =>
  `decade-${entry.slug ?? 'before-1990'}`;

export const durationRowKey = (bucket: DurationBucket): string =>
  `duration-${bucket}`;

type PreviewShow = Art & Readonly<{ id: number }>;

/** A deck fans three posters */
const DECK = 3;

export type DurationTileInput = Readonly<{
  bucket: DurationBucket;
  count: number;
  /** how many shows the tile's list holds */
  listed: number;
  preview: ReadonlyArray<PreviewShow>;
}>;

/** A deck's shows: the first three with a poster, or none under three (the calm tile) */
const deckShows = (preview: ReadonlyArray<PreviewShow>) => {
  const withPosters = preview.filter((show) => show.poster).slice(0, DECK);
  return hasEnoughPosters(withPosters.length) ? withPosters : [];
};

/** The preview shows a Duration tile draws: its backdrop's show, or the deck's three */
export const durationDressIds = (
  preview: ReadonlyArray<PreviewShow>,
  dress: DurationTileEntry['dress'],
): ReadonlyArray<number> =>
  (dress === 'backdrop'
    ? preview.filter((show) => show.backdrop).slice(0, 1)
    : deckShows(preview)
  ).map((show) => show.id);

const bucketOrder = (tile: DurationTileInput) =>
  DURATION_BUCKETS.indexOf(tile.bucket);

/**
 * Duration: the API's tiles in a fixed order, dressed with their own
 * preview shows, without the ones whose list is too short to open
 */
/** The show a Duration tile draws as its backdrop: its preview's first with one */
export const backdropShowOf = <T extends Readonly<{ backdrop: string | null }>>(
  preview: ReadonlyArray<T>,
): T | undefined => preview.find((show) => show.backdrop);

export const buildDurationTiles = (
  tiles: ReadonlyArray<DurationTileInput>,
  entries: Readonly<Record<DurationBucket, DurationTileEntry>>,
): ReadonlyArray<LensTileView> =>
  [...tiles]
    // a tile whose list is under three shows is not offered: it would open
    // a row of one (the others take its place in the grid)
    .filter((tile) => hasEnoughPosters(tile.listed))
    .sort((a, b) => bucketOrder(a) - bucketOrder(b))
    .map((tile) => {
      const entry = entries[tile.bucket];
      const line = entry.line ?? countLine(tile.count, 'miniseries');
      const backdrop = backdropShowOf(tile.preview)?.backdrop;
      const posters = deckShows(tile.preview).map((show) => show.poster);
      // A tile whose preview has no art (or a deck under three posters)
      // draws the calm icon, never a blank box or a lopsided fan
      const look: LensTileView['look'] =
        entry.dress === 'backdrop'
          ? backdrop
            ? {
                image: backdrop,
                kind: 'backdrop',
                position: entry.position ?? 'center',
              }
            : { kind: 'calm' }
          : posters.length > 0
            ? { kind: 'deck', posters }
            : { kind: 'calm' };
      return {
        action: { kind: 'open', row: durationRowKey(tile.bucket) },
        key: durationRowKey(tile.bucket),
        line,
        lineGlyph: lineGlyphOf(line),
        look,
        name: entry.name,
      };
    });
