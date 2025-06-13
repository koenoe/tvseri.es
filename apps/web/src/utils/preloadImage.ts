const preloadCache = new Map<string, string>();

export default function preloadImage(src: string): Promise<string> {
  if (preloadCache.has(src)) {
    return Promise.resolve(preloadCache.get(src)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      preloadCache.set(src, src);
      resolve(src);
    };
    img.onerror = (err) => reject(err);
  });
}
