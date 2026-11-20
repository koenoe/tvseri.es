import Image from 'next/image';
import { type RefObject, useCallback, useState } from 'react';

import cn from '@/lib/cn';

import { DIARY_POSTER } from './diaryStyles';
import glowPosterLoader from './glowPosterLoader';
import saturatePixels from './saturatePixels';

const SIZES = '(max-width: 767px) 40px, 56px';

const POSTER = cn(
  DIARY_POSTER,
  'relative block shrink-0 overflow-hidden bg-white/6 shadow-[0_8px_24px_rgb(0_0_0/0.35)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)]',
);

/**
 * A row's poster: one poster, also for a row of several episodes
 * (its expand control already says there is more). `imageRef` lets the
 * card's glow read it, so it loads with CORS under its own cache key
 * (`glowPosterLoader`). If that load still fails, it loads once more the
 * plain way: the poster always shows, its glow then without the lift.
 */
export default function DiaryPoster({
  imageRef,
  src,
}: Readonly<{
  imageRef?: RefObject<HTMLImageElement | null>;
  src: string | null;
}>) {
  const [cors, setCors] = useState(true);
  const plain = useCallback(() => setCors(false), []);
  return (
    <span className={POSTER}>
      {src ? (
        <Image
          alt=""
          className="object-cover"
          crossOrigin={cors ? 'anonymous' : undefined}
          fill
          loader={cors ? glowPosterLoader : undefined}
          onError={cors ? plain : undefined}
          ref={imageRef}
          sizes={SIZES}
          src={src}
        />
      ) : null}
    </span>
  );
}

/** The glow's bitmap: the poster at 8 × 12, in its own 2:3 */
const GLOW_WIDTH = 8;
const GLOW_HEIGHT = 12;

/** The glow's lift, as CSS `saturate(130%)` */
const GLOW_SATURATION = 1.3;

/**
 * The poster, shrunk once into the glow's 8 × 12 canvas and saturated by
 * hand: WebKit has no canvas `filter`, and without the lift a dark poster's
 * glow came out flat grey in Safari. Reading the 96 pixels needs an
 * untainted canvas; if the poster still arrived without CORS, the plain
 * draw stays.
 */
function paintGlow(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, GLOW_WIDTH, GLOW_HEIGHT);
  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, GLOW_WIDTH, GLOW_HEIGHT);
  } catch {
    return;
  }
  saturatePixels(pixels.data, GLOW_SATURATION);
  context.putImageData(pixels, 0, 0);
}

/**
 * The card's light: its poster, shrunk to 8 × 12 and stretched over the
 * card (`object-cover`), so the browser's smooth upscale is the blur.
 * A CSS `blur()` gave every card its own compositor pass, redrawn each
 * frame of a scroll; this is a plain image, drawn once. It paints when the
 * poster has loaded (lazy, like the poster), from the file the poster
 * already fetched.
 */
export function DiaryGlow({
  poster,
}: Readonly<{ poster: RefObject<HTMLImageElement | null> }>) {
  const paint = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      const image = poster.current;
      if (!canvas || !image) {
        return;
      }
      if (image.complete && image.naturalWidth > 0) {
        paintGlow(canvas, image);
        return;
      }
      const onLoad = () => paintGlow(canvas, image);
      image.addEventListener('load', onLoad, { once: true });
      return () => image.removeEventListener('load', onLoad);
    },
    [poster],
  );
  return (
    <canvas
      aria-hidden="true"
      className="absolute inset-0 -z-2 size-full object-cover opacity-45"
      height={GLOW_HEIGHT}
      ref={paint}
      width={GLOW_WIDTH}
    />
  );
}
