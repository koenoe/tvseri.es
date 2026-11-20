import type { Feature } from '@tvseri.es/schemas';
import Image from 'next/image';
import Link from 'next/link';

import { clockGlyph, trendingGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import {
  PICTURE_ZOOM,
  PICTURE_ZOOM_GROUP,
} from '@/components/ui/tile/tileHover';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { PICTURE_BLEED, PICTURE_CARD } from '../../pictureCard';
import { MomentFrame } from '../Moment';
import ShowMeta from '../ShowMeta';
import { archiveLine, archiveWhy } from './archiveLine';

type Archive = Extract<Feature, Readonly<{ kind: 'archive' }>>;

/**
 * The banner (320px, the text at its foot; taller on a phone when the text
 * needs it), a picture card (`PICTURE_CARD`: the print and the fade reach a
 * pixel past it, a ring in its colour closes the edge). The fade comes from
 * the left from lg, where the 600px text column ends inside it; below lg it
 * rises from the foot, under the whole text (at 800 a side fade would leave
 * the line on the art).
 */
export const ARCHIVE_CARD = cn(
  PICTURE_CARD,
  'flex min-h-80 items-end rounded-14 bg-[#14181a] [--picture-edge:#14181a] md:h-80 md:rounded-16',
);

/**
 * The fade over the print, inside the print's own layer (`PICTURE_BLEED`):
 * drawn apart from it, the card's rounded corners clip each on its own and
 * the bright print shows through the fade in the corners' part pixels
 */
export const ARCHIVE_FADE =
  'absolute inset-0 bg-linear-to-t from-[rgb(14_14_14/0.92)] via-[rgb(14_14_14/0.8)] via-60% to-[rgb(14_14_14/0.25)] lg:bg-linear-to-r lg:from-[rgb(14_14_14/0.92)] lg:via-[rgb(14_14_14/0.5)] lg:via-45% lg:to-transparent lg:to-75%';

const ARCHIVE_LINK = cn(ARCHIVE_CARD, PICTURE_ZOOM_GROUP);

/** The print: zooms on hover like Home's other picture links */
const PRINT = cn('object-cover object-[center_30%]', PICTURE_ZOOM);

/** The text block over the fade: title, two sentences, facts, why */
export const ARCHIVE_TEXT =
  'relative z-2 flex max-w-150 flex-col gap-3 px-4 pt-16 pb-6 md:px-10 md:py-9';

/** The card's label, top left on the picture (a soft shadow under it) */
export const ARCHIVE_LABEL =
  'absolute top-6 right-4 left-4 z-2 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] md:top-8 md:right-10 md:left-10';

const LABEL_ID = 'archive-label';

/**
 * "From the archive": a 320px banner of an old, top
 * rated show nobody is watching this week; the backdrop under a dark fade
 * from the left, the label, the title, two sentences, the facts and why it
 * is here.
 */
export default function FromTheArchive({
  feature,
}: Readonly<{ feature: Archive }>) {
  const { series } = feature;
  const href = showPath(series.id, series.slug);
  return (
    <MomentFrame name="feature">
      <section aria-labelledby={LABEL_ID} className={PAGE_COLUMN}>
        <Link className={ARCHIVE_LINK} href={href}>
          <span aria-hidden="true" className={PICTURE_BLEED}>
            {series.backdropImage ? (
              <Image
                alt=""
                className={PRINT}
                fill
                sizes="(min-width: 1280px) 1216px, 100vw"
                src={series.backdropImage}
              />
            ) : null}
            <span className={ARCHIVE_FADE} />
          </span>
          <MomentLabel
            className={ARCHIVE_LABEL}
            glyph={clockGlyph}
            id={LABEL_ID}
            title={FEATURE_TITLE.archive}
          />
          <span className={ARCHIVE_TEXT}>
            <h3 className="text-title-1 text-white">{series.title}</h3>
            <p className="text-body text-white/80">{archiveLine(feature)}</p>
            <ShowMeta series={series} />
            <span className="flex items-center gap-2 text-body-sm text-white/80">
              <Icon className="shrink-0" glyph={trendingGlyph} size={14} />
              {archiveWhy(feature)}
            </span>
          </span>
        </Link>
      </section>
    </MomentFrame>
  );
}
