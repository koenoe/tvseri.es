/** biome-ignore-all assist/source/useSortedAttributes: src should be last */
import { getImageProps } from 'next/image';
import { preload } from 'react-dom';
import { twMerge } from 'tailwind-merge';

/**
 * Backdrops span the viewport (page background, home spotlight). The page
 * background and the first spotlight slide show the same backdrop, so they
 * must share `sizes`, or the browser downloads two different files.
 *
 * Note: `object-cover` draws a 16:9 backdrop wider than its box on portrait
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
) {
  const { props } = getImageProps({ alt: '', fill: true, sizes, src });

  return { sizes: props.sizes, src: props.src, srcSet: props.srcSet };
}

export default function BackgroundImage({
  src,
  className,
  priority = false,
  sizes,
  ...rest
}: React.AllHTMLAttributes<HTMLImageElement> &
  Readonly<{ src: string; priority?: boolean; sizes?: string }>) {
  const image = getBackgroundImageProps(src, sizes);
  const fetchPriority = priority ? 'high' : 'auto';

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
    // biome-ignore lint/performance/noImgElement: exception
    <img
      {...rest}
      alt=""
      className={twMerge(
        'relative h-full w-full select-none object-cover object-top',
        className,
      )}
      decoding="async"
      draggable={false}
      fetchPriority={fetchPriority}
      loading={priority ? 'eager' : 'lazy'}
      sizes={image.sizes}
      srcSet={image.srcSet}
      // It's intended to keep `src` the last attribute because React updates
      // attributes in order.
      src={image.src}
    />
  );
}
