import type { BecauseYouWatched } from '@tvseri.es/schemas';

import { domeGlyph } from '@/components/ui/icon/glyphs';

import { MomentFrame } from '../feature/Moment';
import { PAGE_COLUMN } from '../frame';
import MomentLabel from '../MomentLabel';
import { subline } from './if-you-liked/copy';
import LikedPick from './if-you-liked/LikedPick';
import LikedSource from './if-you-liked/LikedSource';

const LABEL_ID = 'if-you-liked-label';

export const IF_YOU_LIKED_SHOWN = 4;

/** The label's words before the show's title (the placeholder draws them too) */
export const IF_YOU_LIKED_WORDS = 'If you liked';

/** The card, its label and the subline over the row of shows: shared with the placeholder */
export const IF_YOU_LIKED_CARD =
  'flex flex-col gap-1 rounded-16 bg-black/25 py-5 md:px-8 md:pt-6.5 md:pb-7';
export const IF_YOU_LIKED_LABEL = 'mb-1 px-4 md:px-0';
export const IF_YOU_LIKED_SUBLINE = 'mb-4 px-4 text-title-3 text-white md:px-0';
/**
 * The source, the arrow and four picks need 972px plus the card's padding:
 * the row scrolls (as on a phone) until 1280 gives it that room, so it never
 * runs past the page between 1024 and 1083. It scrolls inside the card's
 * 16px padding (a margin, not a padding: a scroller clips at its own edge),
 * so a poster is cut at the padding line, never by the card's rounded edge
 */
export const IF_YOU_LIKED_ROW =
  'mx-4 flex items-start overflow-x-auto [scrollbar-width:none] md:mx-0 xl:overflow-visible';
export const IF_YOU_LIKED_PICKS = 'flex gap-3 md:gap-6';

/**
 * Signed in, "If you liked X" in the toy slot on alternate days, no title above the card: its label names the show, then
 * the line about the picks, the finished show's poster with its Watched label, an
 * arrow, and four shows like it with the reason each one is here. Streamed
 * per viewer; nothing when there's no show to start from.
 */
export default function IfYouLiked({
  data,
}: Readonly<{ data: BecauseYouWatched }>) {
  const { source } = data;
  const items = data.items.slice(0, IF_YOU_LIKED_SHOWN);
  if (!source || items.length === 0) {
    return null;
  }
  const title = `${IF_YOU_LIKED_WORDS} ${source.title}`;
  return (
    <MomentFrame name="toy-if-you-liked">
      <div className={PAGE_COLUMN}>
        <section aria-labelledby={LABEL_ID} className={IF_YOU_LIKED_CARD}>
          <MomentLabel
            className={IF_YOU_LIKED_LABEL}
            glyph={domeGlyph}
            id={LABEL_ID}
            title={title}
          />
          <h3 className={IF_YOU_LIKED_SUBLINE}>{subline(items)}</h3>
          <div className={IF_YOU_LIKED_ROW}>
            <LikedSource from={source.from} series={source.series} />
            <Arrow />
            <ul className={IF_YOU_LIKED_PICKS}>
              {items.map((item) => (
                <LikedPick item={item} key={item.series.id} />
              ))}
            </ul>
          </div>
        </section>
      </div>
    </MomentFrame>
  );
}

/**
 * The arrow between the source and the picks: a 150 × 225 box with
 * the line at mid-poster; a shorter one at the phone's poster height.
 */
export function Arrow() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[210px] w-12 shrink-0 items-center md:h-auto md:w-[150px]"
    >
      <svg
        className="block md:hidden"
        fill="none"
        height="12"
        viewBox="0 0 48 12"
        width="48"
      >
        <path
          d="M6 6H42"
          stroke="rgb(255 255 255 / 0.22)"
          strokeLinecap="round"
          strokeWidth={2}
        />
        <path
          d="M34 0l8 6-8 6"
          stroke="rgb(255 255 255 / 0.35)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
      <svg
        className="hidden md:block"
        fill="none"
        height="225"
        viewBox="0 0 150 225"
        width="150"
      >
        <path
          d="M8 112C60 112 60 112 142 112"
          stroke="rgb(255 255 255 / 0.22)"
          strokeLinecap="round"
          strokeWidth={2}
        />
        <path
          d="M134 106l8 6-8 6"
          stroke="rgb(255 255 255 / 0.35)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
