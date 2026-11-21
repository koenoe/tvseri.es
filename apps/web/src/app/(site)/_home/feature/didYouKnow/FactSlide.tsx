import type { DidYouKnowFact } from '@tvseri.es/schemas';
import Image from 'next/image';
import type { CSSProperties } from 'react';

import { TEXT_ARRIVAL } from '@/components/motion/textArrival';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';

import { PICTURE_BLEED, pictureShade } from '../../pictureCard';
import ShowMeta from '../ShowMeta';
import type { FactCopy } from './facts';
import { factFade } from './fade';
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
 * The fade from the foot below lg (the text stacks over the whole card), from
 * the left from lg (`factFade`: dark under the text only), in the picture's
 * colour, darkened (`pictureShade`), near-black without one
 */
const SHADE =
  'absolute inset-0 bg-linear-to-t from-[color:var(--picture-shade,rgb(14_16_17))]/97 via-[color:var(--picture-shade,rgb(14_16_17))]/86 via-70% to-[color:var(--picture-shade,rgb(14_16_17))]/45 lg:bg-(image:--fact-fade)';

/**
 * Below lg the card's label sits at the top, where the fade from the foot is
 * at its lightest: a band under it, clear by the number
 */
const TOP =
  'absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_75%,transparent)_0px,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_70%,transparent)_44px,transparent_104px)] lg:hidden';

/**
 * From lg the deck's controls sit bottom right on the picture, where the
 * fade has cleared: a shade in that corner only, as big as the pips and
 * "Another" need (below lg the fade already rises from the foot)
 */
const FOOT =
  'absolute inset-0 bg-[radial-gradient(440px_150px_at_100%_100%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_84%,transparent)_0%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_70%,transparent)_50%,transparent_100%)] max-lg:hidden';

/** The text arrives behind the picture (the deck's layer says when) */
const BODY = cn(FACT_BODY, TEXT_ARRIVAL);

/**
 * One fact: the show's backdrop under its shades, in the picture's colour (a
 * pixel past the deck), the big number with its unit, the sentence, the
 * facts and a link.
 */
export default function FactSlide({
  copy,
  fact,
}: Readonly<{ copy: FactCopy; fact: DidYouKnowFact }>) {
  const { series } = fact;
  const sentence = cn(FACT_SENTENCE, FACT_SENTENCE_ROOM);
  const open = `Open ${series.title}`;
  const href = showPath(series.id, series.slug);
  const shade = pictureShade(series.backdropColor);
  const fade = { '--fact-fade': factFade(copy.value) } as CSSProperties;
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
        <span className={SHADE} style={fade} />
        <span className={TOP} />
        <span className={FOOT} />
      </span>
      <div className={BODY}>
        <div className={FACT_NUMBER_COLUMN}>
          <b className={FACT_NUMBER}>{copy.value}</b>
          <small className={FACT_UNIT}>{copy.unit}</small>
        </div>
        <div className={FACT_TEXT_COLUMN}>
          <p className={sentence}>{copy.text}</p>
          <ShowMeta series={series} />
          <ButtonLink
            className={FACT_OPEN}
            href={href}
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
