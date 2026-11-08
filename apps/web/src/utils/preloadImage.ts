const preloadCache = new Map<string, string>();

/**
 * Pass the `<img>`'s `srcSet` and `sizes` for responsive images, so the
 * browser preloads the same candidate it will render instead of `src`.
 */
export default function preloadImage(
  src: string,
  { sizes, srcSet }: Readonly<{ sizes?: string; srcSet?: string }> = {},
): Promise<string> {
  const key = srcSet ?? src;

  if (preloadCache.has(key)) {
    return Promise.resolve(preloadCache.get(key)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    // `sizes` and `srcset` before `src`, so `src` alone is never fetched
    if (sizes) {
      img.sizes = sizes;
    }
    if (srcSet) {
      img.srcset = srcSet;
    }
    img.src = src;
    img.onload = () => {
      preloadCache.set(key, src);
      resolve(src);
    };
    img.onerror = (err) => reject(err);
  });
}
