import type { ImageLoaderProps } from 'next/image';

import tmdbImageLoader from '@/lib/tmdbImageLoader';

/**
 * History's poster, under its own cache key. The glow reads its pixels, so
 * it loads with CORS, but TMDB only sends `access-control-allow-origin`
 * when the request has an `Origin` and doesn't `Vary` on it: a copy that
 * another page cached without CORS fails Chrome's CORS check and the poster
 * would not load at all. TMDB ignores the query; the cost is one extra
 * download of a poster the browser already holds under the plain URL.
 */
export default function glowPosterLoader(props: ImageLoaderProps): string {
  return `${tmdbImageLoader(props)}?cors`;
}
