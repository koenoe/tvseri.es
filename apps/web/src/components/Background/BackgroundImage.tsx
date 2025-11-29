/** biome-ignore-all assist/source/useSortedAttributes: src should be last */
import { cx } from 'class-variance-authority';
import { preload } from 'react-dom';

// Track preloaded URLs to avoid duplicate preloads
const preloadedUrls = new Set<string>();

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
    // Preload both sizes - browser will use the appropriate one based on viewport
    // Use Set to avoid duplicate preloads when same image is rendered multiple times
    if (!preloadedUrls.has(SD)) {
      preloadedUrls.add(SD);
      preload(SD, {
        as: 'image',
        fetchPriority: 'high',
        imageSizes,
        imageSrcSet,
      });
    }

    if (!preloadedUrls.has(HD)) {
      preloadedUrls.add(HD);
      preload(HD, {
        as: 'image',
        fetchPriority: 'high',
        imageSizes,
        imageSrcSet,
      });
    }
  }

  return (
    // biome-ignore lint/performance/noImgElement: exception
    <img
      {...rest}
      alt=""
      className={cx(
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
