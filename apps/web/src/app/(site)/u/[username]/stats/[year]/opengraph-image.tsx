import { cardCacheControl, cardYearMessage } from './_card/cardRequest';
import { isCardUsername } from './_card/cardUser';
import { renderCardImage } from './_card/renderCard';
import { getStatsClock } from './_data/clock';
import { parseStatsYear } from './_lib/year';

/**
 * The page's og:image: the share card laid out at 1200 × 630 (the square's
 * parts in one landscape row, `CARD_LAYOUTS.og`), Dark, so a pasted link
 * previews as the card. Same rules and cache as the card route.
 *
 * A year in progress, a year without stats, an unknown user or a param that
 * isn't the user's exact username has no card: the image is a plain 404
 * (what `notFound()` in a route handler also gives, without the throw), not
 * cached, so a preview just shows no image.
 */

export const size = { height: 630, width: 1200 };

// A literal, as Next reads it (`CARD_CONTENT_TYPE`)
export const contentType = 'image/jpeg';

export default async function Image({
  params,
}: Readonly<{ params: Promise<{ username: string; year: string }> }>) {
  const { username, year: yearParam } = await params;
  const year = parseStatsYear(yearParam);
  if (!isCardUsername(username) || year === null) {
    return notFound();
  }
  if (cardYearMessage(year, (await getStatsClock(year)).state)) {
    return notFound();
  }
  const result = await renderCardImage(username, year, 'og', 'dark');
  if (result === 'not-found' || result === 'unavailable') {
    return notFound();
  }
  return new Response(result.image, {
    headers: {
      'Cache-Control': cardCacheControl(result.degraded),
      'Content-Type': contentType,
    },
  });
}

const notFound = () =>
  new Response(null, { headers: { 'Cache-Control': 'no-store' }, status: 404 });
