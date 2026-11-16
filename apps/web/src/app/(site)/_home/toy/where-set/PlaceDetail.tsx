'use client';

import type { ReactNode } from 'react';

import Button from '@/components/ui/button/Button';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph, pinGlyph } from '@/components/ui/icon/glyphs';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';

import {
  ACTION_PAIR,
  ACTION_PAIR_BUTTON,
  ACTION_PAIR_SOLID,
} from '../../actionPair';
import { DETAIL, DETAIL_IMAGE, DETAIL_SHADE, DETAIL_TITLE } from './layout';

/** A layer of the image that cross-fades in when its show is up */
const fade = (on: boolean) =>
  cn(
    'opacity-0 transition-opacity duration-300 ease-[ease]',
    on && 'opacity-100',
  );

import type { MapPlace } from './types';

/**
 * The place's show (HMFinal `e2-md`): its backdrop (220px, 12px corners)
 * with its logo, or its written title, on it (both cross-faded over 300ms,
 * together, so a logo never shows over another show's image), its facts,
 * "Open {show}" and "More set in {place}" (the place's next show; hidden
 * when it has one). The title is announced from a visually hidden copy.
 */
export default function PlaceDetail({
  images,
  metas,
  onMore,
  onWarmMore,
  place,
  show,
  titles,
  warm,
}: Readonly<{
  images: ReadonlyArray<ReactNode>;
  metas: ReadonlyArray<ReactNode>;
  onMore: (() => void) | undefined;
  onWarmMore: () => void;
  place: MapPlace;
  show: MapPlace['shows'][number] | undefined;
  titles: ReadonlyArray<ReactNode>;
  warm: ReadonlySet<number>;
}>) {
  if (!show) {
    return null;
  }
  return (
    <div className={DETAIL}>
      <div className={DETAIL_IMAGE}>
        {/* the backdrops and their shade: one layer, clipped once */}
        <span aria-hidden="true" className={PICTURE_LAYER}>
          {images.map((image, index) => {
            const classes = cn('absolute inset-0', fade(index === show.image));
            return warm.has(index) ? (
              <span className={classes} key={index}>
                {image}
              </span>
            ) : null;
          })}
          <span className={DETAIL_SHADE} />
        </span>
        {titles.map((title, index) => {
          const classes = cn(DETAIL_TITLE, fade(index === show.image));
          return warm.has(index) ? (
            <span aria-hidden="true" className={classes} key={index}>
              {title}
            </span>
          ) : null;
        })}
        <span aria-live="polite" className="sr-only">
          {show.title}
        </span>
      </div>
      {metas[show.image]}
      <span className={ACTION_PAIR}>
        <ButtonLink
          className={ACTION_PAIR_SOLID}
          href={show.href}
          icon={arrowRightGlyph}
          size="sm"
          variant="primary"
        >
          {`Open ${show.title}`}
        </ButtonLink>
        {onMore ? (
          <Button
            className={ACTION_PAIR_BUTTON}
            icon={pinGlyph}
            onClick={onMore}
            onFocus={onWarmMore}
            onPointerEnter={onWarmMore}
            size="sm"
          >
            {`More set in ${place.name}`}
          </Button>
        ) : null}
      </span>
    </div>
  );
}
