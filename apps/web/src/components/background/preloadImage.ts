const preloadCache = new Map<string, string>();

/**
 * The last two images preloaded, kept referenced so the browser keeps their
 * decoded pixels for the `<img>` that shows them next (the spotlight preloads
 * the next slide while the current one shows).
 */
const held: HTMLImageElement[] = [];

/**
 * Whether `preloadImage` has loaded and decoded this image already (same
 * `srcSet` as the call), so a crossfade can start on it at once.
 */
export function isPreloaded(
  src: string,
  { srcSet }: Readonly<{ srcSet?: string }> = {},
): boolean {
  return preloadCache.has(srcSet ?? src);
}

/**
 * Loads an image and decodes it off the main thread (`decode()`) before it is
 * shown, so a crossfade never fades to a blank and its first paint is not the
 * frame that pays for the decode.
 * Pass the `<img>`'s `srcSet` and `sizes` for responsive images, so the
 * browser preloads the same candidate it will render instead of `src`.
 */
export default function preloadImage(
  src: string,
  { sizes, srcSet }: Readonly<{ sizes?: string; srcSet?: string }> = {},
): Promise<string> {
  const key = srcSet ?? src;
  const cached = preloadCache.get(key);

  if (cached) {
    return Promise.resolve(cached);
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
      const done = () => {
        held.push(img);
        held.splice(0, held.length - 2);
        preloadCache.set(key, src);
        resolve(src);
      };
      // a failed decode is not a failed load: the `<img>` decodes it itself
      img.decode().then(done, done);
    };
    img.onerror = (error) => reject(error);
  });
}
