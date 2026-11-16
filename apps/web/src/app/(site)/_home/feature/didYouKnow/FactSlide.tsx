import type { DidYouKnowFact } from '@tvseri.es/schemas';
import Image from 'next/image';

import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import { FOOT_SHADE } from '@/components/ui/tile/footShade';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';

import { PICTURE_BLEED, pictureShade } from '../../pictureCard';
import ShowMeta from '../ShowMeta';
import type { FactCopy } from './facts';
import {
  FACT_BODY,
  FACT_NUMBER,
  FACT_NUMBER_COLUMN,
  FACT_OPEN,
  FACT_SENTENCE,
  FACT_SENTENCE_ROOM,
  FACT_TEXT_COLUMN,
  FACT_UNIT,
} from './layout';

/**
 * The fade from the left (from the foot below lg) in the picture's colour,
 * darkened (`pictureShade`), near-black without one
 */
const SHADE =
  'absolute inset-0 bg-linear-to-t from-[color:var(--picture-shade,rgb(14_16_17))]/97 via-[color:var(--picture-shade,rgb(14_16_17))]/86 via-70% to-[color:var(--picture-shade,rgb(14_16_17))]/45 lg:bg-linear-to-r lg:from-0% lg:via-42% lg:to-[color:var(--picture-shade,rgb(14_16_17))]/15 lg:to-80%';

/**
 * From lg the deck's controls sit bottom right on the picture: the shared
 * foot shade reaches under them (below lg the fade already rises from the
 * foot)
 */
const FOOT = cn(FOOT_SHADE, 'max-lg:hidden');

/**
 * One fact: the show's backdrop under a fade from the left
 * and a shade from the foot, in the picture's colour (both a pixel past the
 * deck), the big number with its unit, the sentence, the facts and a link.
 */
export default function FactSlide({
  copy,
  fact,
}: Readonly<{ copy: FactCopy; fact: DidYouKnowFact }>) {
  const { series } = fact;
  const sentence = cn(FACT_SENTENCE, FACT_SENTENCE_ROOM);
  const open = `Open ${series.title}`;
  const shade = pictureShade(series.backdropColor);
  return (
    <div className="relative h-full">
      <span className={PICTURE_BLEED} style={shade}>
        {series.backdropImage ? (
          <Image
            alt=""
            className="object-cover object-[center_30%]"
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            src={series.backdropImage}
          />
        ) : null}
        <span className={SHADE} />
        <span className={FOOT} />
      </span>
      <div className={FACT_BODY}>
        <div className={FACT_NUMBER_COLUMN}>
          <b className={FACT_NUMBER}>{copy.value}</b>
          <small className={FACT_UNIT}>{copy.unit}</small>
        </div>
        <div className={FACT_TEXT_COLUMN}>
          <p className={sentence}>{copy.text}</p>
          <ShowMeta series={series} />
          <ButtonLink
            className={FACT_OPEN}
            href={showPath(series.id, series.slug)}
            icon={arrowRightGlyph}
            size="sm"
          >
            {open}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
