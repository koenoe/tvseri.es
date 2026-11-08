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
 * swapped for the smallest standard TMDB size that's at least the requested
 * width. Anything else (other hosts, other sizes like the cast face crops) is
 * returned unchanged.
 *
 * Every kind is capped at today's default and `original` is never used.
 * Measured for one backdrop: `w1920_and_h1080_multi_faces` 370 KB (today),
 * `w1280` 168 KB, `w780` 65 KB, `w300` 12 KB, but `original` 1,480 KB. Poster:
 * `w300_and_h450_bestv2` 33 KB (today), `w342` 14 KB, `w185` 5 KB. High-DPR
 * desktops request ~3,500px, so falling back to `original` would make them ~4x
 * heavier than today. With the caps, phones get much smaller images and
 * desktops are never worse off.
 *
 * Keep this pure (no request-time reads): it runs during prerendering (Cache
 * Components) and in `getImageProps` on the server, which is also why there's
 * no `'use client'` here.
 */

type TmdbSize = Readonly<{ segment: string; width: number }>;

const widths = (...values: ReadonlyArray<number>): TmdbSize[] =>
  values.map((width) => ({ segment: `w${width}`, width }));

const LOGO_SIZES = widths(45, 92, 154, 185, 300, 500);

/** Keyed by the API's default size segment for each image kind. */
const SIZES_BY_DEFAULT_SEGMENT: ReadonlyMap<
  string,
  ReadonlyArray<TmdbSize>
> = new Map([
  // Backdrop: anything above 1280 gets today's 1920 crop
  [
    'w1920_and_h1080_multi_faces',
    [
      ...widths(300, 780, 1280),
      { segment: 'w1920_and_h1080_multi_faces', width: 1920 },
    ],
  ],
  // Poster: capped at `w342` (sharper than today's `w300_and_h450_bestv2`
  // but under half its bytes); `w500` would make DPR 3 phones heavier
  ['w300_and_h450_bestv2', widths(92, 154, 185, 342)],
  // Title treatment and network logo
  ['w500', LOGO_SIZES],
  // Watch provider logo
  ['w92', LOGO_SIZES],
  // Profile: `h632` is ~421px wide for a 2:3 profile
  [
    'w600_and_h900_bestv2',
    [
      ...widths(45, 185),
      { segment: 'h632', width: 421 },
      { segment: 'w600_and_h900_bestv2', width: 600 },
    ],
  ],
  // Episode still
  [
    'w454_and_h254_bestv2',
    [...widths(92, 185, 300), { segment: 'w454_and_h254_bestv2', width: 454 }],
  ],
]);

const TMDB_IMAGE_URL = /^(https:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/.+)$/;

export default function tmdbImageLoader({
  src,
  width,
}: ImageLoaderProps): string {
  const match = TMDB_IMAGE_URL.exec(src);
  const sizes = match ? SIZES_BY_DEFAULT_SEGMENT.get(match[2]!) : undefined;

  if (!match || !sizes) {
    return src;
  }

  const size =
    sizes.find((candidate) => candidate.width >= width) ?? sizes.at(-1)!;

  return `${match[1]}${size.segment}${match[3]}`;
}
