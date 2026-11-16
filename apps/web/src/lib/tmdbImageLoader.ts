import type { ImageLoaderProps } from 'next/image';

/**
 * Global `next/image` loader (`images.loaderFile` in next.config.ts).
 *
 * Images load straight from TMDB's CDN. Never route them through Vercel Image
 * Optimization (the default loader): it would raise Vercel costs massively.
 *
 * TMDB URLs look like `https://image.tmdb.org/t/p/{size}{path}`. The API sends
 * every image kind with a fixed default size (see
 * `packages/utils/src/buildImageUrl.ts`), so that size tells us the kind. It's
 * swapped for the smallest TMDB size of that kind's ladder that is at least
 * the requested width, so a srcset's `w` descriptors are the files' real
 * widths and a large image gets a large file. Crops keep their framing; a
 * plain width (`w500`) can become any plain width. Anything else (other
 * hosts, `original`, unknown crops) is returned unchanged.
 *
 * Every ladder uses TMDB's documented sizes (any size serves any image path)
 * plus the API's own crops, and stops below `original` (multi-megabyte JPEGs
 * for posters and backdrops). Measured as the WebP browsers get, a poster:
 * `w185` 12 KB, `w300_and_h450_bestv2` 25 KB, `w342` 30 KB, `w500` 56 KB,
 * `w780` 124 KB; a backdrop: `w300` 9 KB, `w500` ~20 KB, `w780` 37 KB,
 * `w1280` 84 KB, `w1920_and_h1080_multi_faces` 179 KB, `original` 472 KB.
 * Which one a page downloads is up to each image's `sizes`, so keep those
 * true to the rendered width.
 *
 * Keep this pure (no request-time reads): it runs during prerendering (Cache
 * Components) and in `getImageProps` on the server, which is also why there's
 * no `'use client'` here.
 */

type TmdbSize = Readonly<{ segment: string; width: number }>;

const widths = (...values: ReadonlyArray<number>): TmdbSize[] =>
  values.map((width) => ({ segment: `w${width}`, width }));

/**
 * A plain width (`w500` title treatments and network logos, `w92` provider
 * logos, the `w300` stills Home's feature gets): any plain width keeps the
 * image's own aspect, so the whole plain ladder applies.
 */
const PLAIN_SIZES = widths(45, 92, 154, 185, 300, 342, 500, 780, 1280);

const PLAIN_SEGMENT = /^w\d+$/;

/** Backdrops and episode stills: both 16:9, so they share one ladder */
const WIDE_SIZES = [
  ...widths(92, 185, 300, 500, 780, 1280),
  { segment: 'w1920_and_h1080_multi_faces', width: 1920 },
];

/** Keyed by the API's default size segment for each image kind. */
const SIZES_BY_DEFAULT_SEGMENT: ReadonlyMap<
  string,
  ReadonlyArray<TmdbSize>
> = new Map([
  // Backdrop
  ['w1920_and_h1080_multi_faces', WIDE_SIZES],
  // Poster: the API's 300 crop is TMDB's 2:3 framing and lighter than w342
  [
    'w300_and_h450_bestv2',
    [
      ...widths(92, 154, 185),
      { segment: 'w300_and_h450_bestv2', width: 300 },
      ...widths(342, 500, 780),
    ],
  ],
  // Cast and collaborator faces: the same crop at twice the size
  [
    'w138_and_h175_face',
    [
      { segment: 'w138_and_h175_face', width: 138 },
      { segment: 'w276_and_h350_face', width: 276 },
    ],
  ],
  // Profile: `h632` is ~421px wide for a 2:3 profile
  [
    'w600_and_h900_bestv2',
    [
      ...widths(45, 185),
      { segment: 'w300_and_h450_bestv2', width: 300 },
      { segment: 'h632', width: 421 },
      { segment: 'w600_and_h900_bestv2', width: 600 },
    ],
  ],
  // Episode still
  ['w454_and_h254_bestv2', WIDE_SIZES],
]);

const TMDB_IMAGE_URL = /^(https:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/.+)$/;

export default function tmdbImageLoader({
  src,
  width,
}: ImageLoaderProps): string {
  const match = TMDB_IMAGE_URL.exec(src);
  const segment = match?.[2] ?? '';
  const sizes =
    SIZES_BY_DEFAULT_SEGMENT.get(segment) ??
    (PLAIN_SEGMENT.test(segment) ? PLAIN_SIZES : undefined);

  if (!match || !sizes) {
    return src;
  }

  const size =
    sizes.find((candidate) => candidate.width >= width) ?? sizes.at(-1)!;

  return `${match[1]}${size.segment}${match[3]}`;
}
