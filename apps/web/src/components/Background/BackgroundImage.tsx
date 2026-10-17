/** biome-ignore-all assist/source/useSortedAttributes: src should be last */
import { preload } from 'react-dom';
import { twMerge } from 'tailwind-merge';

const createImageUrl = (src: string, width: number): string => {
  if (src.includes('w1920_and_h1080_multi_faces') && width === 1280) {
    const resizedSrc = src.replace(
      'w1920_and_h1080_multi_faces',
      'w1280_and_h720_multi_faces',
    );
    return resizedSrc;
  }
  return src;
};

export default function BackgroundImage({
  src,
  className,
  priority = false,
  ...rest
}: React.AllHTMLAttributes<HTMLImageElement> &
  Readonly<{ src: string; priority?: boolean }>) {
  const HD = createImageUrl(src, 1920);
  const SD = createImageUrl(src, 1280);
  const imageSizes = '100vw';
  const imageSrcSet = `
    ${SD} 768w,
    ${HD} 1200w
  `;
  const fetchPriority = priority ? 'high' : 'auto';

  if (priority) {
    // `preload` dedupes within a request on its own (React keys image preloads
    // by `imageSrcSet` + `imageSizes`). Never track URLs in module state: it is
    // shared across requests on the server and suppresses the preload for every
    // visitor after the first. The browser picks the right size from the srcset.
    preload(SD, {
      as: 'image',
      fetchPriority: 'high',
      imageSizes,
      imageSrcSet,
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
      sizes={imageSizes}
      srcSet={imageSrcSet}
      // It's intended to keep `src` the last attribute because React updates
      // attributes in order.
      src={SD}
    />
  );
}
