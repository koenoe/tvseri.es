/** biome-ignore-all assist/source/useSortedAttributes: src should be last */
import { getImageProps } from 'next/image';
import type { ComponentProps } from 'react';
import { preload } from 'react-dom';

import cn from '@/lib/cn';

/**
 * Backdrops span the viewport (page background, home spotlight). The page
 * background and the first spotlight slide show the same backdrop, so they
 * must share `sizes`, or the browser downloads two different files.
 *
 * `object-cover` draws a 16:9 backdrop wider than its box on portrait
 * screens. `sizes` follows the box width on purpose: the cover width would
 * send every phone the 1920 cap, for a background behind gradient overlays.
 */
const BACKGROUND_IMAGE_SIZES = '100vw';

/**
 * Same `src`/`srcSet`/`sizes` as the rendered `<img>` (via the global TMDB
 * loader), so a JS preload fetches exactly the file the browser will pick.
 */
export function getBackgroundImageProps(
  src: string,
  sizes = BACKGROUND_IMAGE_SIZES,
  /**
   * How the caller's `<img>` loads. Not part of the result: in `next dev`,
   * `getImageProps` remembers it for its LCP check, which otherwise flags an
   * eager backdrop as a lazy LCP image. Backdrops are above the fold.
   */
  loading: 'eager' | 'lazy' = 'eager',
) {
  const { props } = getImageProps({ alt: '', fill: true, loading, sizes, src });

  return { sizes: props.sizes, src: props.src, srcSet: props.srcSet };
}

export default function BackgroundImage({
  src,
  className,
  priority = false,
  sizes,
  ...rest
}: Readonly<
  Omit<ComponentProps<'img'>, 'src'> & {
    src: string;
    priority?: boolean;
    sizes?: string;
  }
>) {
  const image = getBackgroundImageProps(
    src,
    sizes,
    priority ? 'eager' : 'lazy',
  );
  const fetchPriority = priority ? 'high' : 'auto';
  const classes = cn(
    'relative h-full w-full select-none object-cover object-top',
    className,
  );

  if (priority) {
    // `preload` dedupes within a request on its own (React keys image preloads
    // by `imageSrcSet` + `imageSizes`). Never track URLs in module state: it is
    // shared across requests on the server and suppresses the preload for every
    // visitor after the first. The browser picks the right size from the srcset.
    preload(image.src, {
      as: 'image',
      fetchPriority: 'high',
      imageSizes: image.sizes,
      imageSrcSet: image.srcSet,
    });
  }

  return (
    // biome-ignore lint/performance/noImgElement: a full-bleed backdrop through the TMDB loader's srcset, preloaded by hand
    <img
      {...rest}
      alt=""
      className={classes}
      decoding="async"
      draggable={false}
      fetchPriority={fetchPriority}
      loading={priority ? 'eager' : 'lazy'}
      sizes={image.sizes}
      srcSet={image.srcSet}
      // `src` stays the last attribute: React sets attributes in order, and
      // `srcSet`/`sizes` must be in place before the browser starts a fetch.
      src={image.src}
    />
  );
}
