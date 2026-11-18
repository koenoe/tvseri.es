import { CACHE_LIFE } from '@tvseri.es/constants';
import * as flags from 'country-flag-icons/string/3x2';

const SVGS: Readonly<Record<string, string | undefined>> = flags;

/**
 * One country's flag (3:2 SVG) as a file, prerendered at build for every code
 * the set has: the country list loads only the flags it scrolls to, instead
 * of the whole set (Settings → Streaming services). Emoji flags show as
 * letters on Windows, so flags are pictures.
 */
export function generateStaticParams() {
  return Object.keys(SVGS)
    .filter((code) => /^[A-Z]{2}$/.test(code))
    .map((code) => ({ code }));
}

export async function GET(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ code: string }> }>,
) {
  const { code } = await params;
  const svg = /^[A-Z]{2}$/.test(code) ? SVGS[code] : undefined;
  if (!svg) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(svg, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_LIFE.immutable.maxAge}, immutable`,
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}
