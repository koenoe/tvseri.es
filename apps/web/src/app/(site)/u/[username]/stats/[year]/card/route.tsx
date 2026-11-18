import type { NextRequest } from 'next/server';
import { getStatsClock } from '@/lib/stats/clock';
import {
  CARD_CONTENT_TYPE,
  cardCacheControl,
  cardYearMessage,
  parseCardRequest,
} from '../_card/cardRequest';
import { isCardUsername } from '../_card/cardUser';
import { renderCardImage } from '../_card/renderCard';

/**
 * `GET /u/{username}/stats/{year}/card?format=story|square&theme=dark|colour`:
 * the share card as a JPEG, 1080 × 1080 (default) or 1080 × 1920. The bytes
 * are cached per user + year + variant (`renderCardImage`); the CDN keeps them a day
 * (`cardCacheControl`), a card with a failed poster only minutes.
 *
 * - 400: an unknown `format` or `theme`, any other query key, or a
 *   repeated key (a missing one is the default).
 * - 404: a param that isn't a user's exact username, an unknown user, a year
 *   without a page or episodes, or a year that isn't over ("No card for 2026
 *   so far"). Not cached: the year ends, the user marks.
 * - 503: the API didn't answer; never cached.
 */
export async function GET(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<{ username: string; year: string }> }>,
) {
  const { username, year: yearParam } = await params;
  if (!isCardUsername(username)) {
    return text('Not found', 404);
  }
  const parsed = parseCardRequest(yearParam, request.nextUrl.searchParams);
  if (!parsed.ok) {
    return text(parsed.message, parsed.status);
  }
  const { format, theme, year } = parsed.request;
  const notYet = cardYearMessage(year, (await getStatsClock(year)).state);
  if (notYet) {
    return text(notYet, 404);
  }
  const result = await renderCardImage(username, year, format, theme);
  if (result === 'not-found') {
    return text('Not found', 404);
  }
  if (result === 'unavailable') {
    return text('Stats are unavailable right now', 503);
  }
  return new Response(result.image, {
    headers: {
      'Cache-Control': cardCacheControl(result.degraded),
      'Content-Type': CARD_CONTENT_TYPE,
    },
  });
}

const text = (body: string, status: number) =>
  new Response(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
    status,
  });
