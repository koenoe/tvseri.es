import Image from 'next/image';
import {
  type Ref,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useState,
} from 'react';

import cn from '@/lib/cn';

import { DIARY_POSTER } from './diaryStyles';
import evenPixels from './evenPixels';
import glowPosterLoader from './glowPosterLoader';
import saturatePixels from './saturatePixels';

const SIZES = '(max-width: 767px) 40px, 56px';

const POSTER = cn(
  DIARY_POSTER,
  'relative block shrink-0 overflow-hidden bg-white/6 shadow-[0_8px_24px_rgb(0_0_0/0.35)] image-rim',
);

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
  if (!context || image.naturalWidth === 0) {
    return;
  }
  context.clearRect(0, 0, GLOW_WIDTH, GLOW_HEIGHT);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, GLOW_WIDTH, GLOW_HEIGHT);
  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, GLOW_WIDTH, GLOW_HEIGHT);
  } catch {
    return;
  }
  saturatePixels(pixels.data, GLOW_SATURATION);
  // every row's glow at one brightness: a pale poster no longer outshines
  evenPixels(pixels.data);
  context.putImageData(pixels, 0, 0);
}

/**
 * A row's poster: one poster, also for a row of several episodes
 * (its expand control already says there is more). It loads with CORS
 * under its own cache key (`glowPosterLoader`) so it can paint the card's
 * glow (`glowRef`). If that load still fails, it loads once more the plain
 * way: the poster always shows, its glow then without the lift.
 *
 * The glow paints from next/image's `onLoad`, which runs once per `src`
 * after `decode()`, also for a poster that loaded before hydration. A draw
 * in the native `load` event left some glows blank in WebKit, for posters
 * that loaded after their row: there the bitmap could be drawn only a task
 * later.
 */
export default function DiaryPoster({
  glowRef,
  src,
}: Readonly<{
  glowRef?: RefObject<HTMLCanvasElement | null>;
  src: string | null;
}>) {
  const [cors, setCors] = useState(true);
  const plain = useCallback(() => setCors(false), []);
  const paint = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const canvas = glowRef?.current;
      if (canvas) {
        paintGlow(canvas, event.currentTarget);
      }
    },
    [glowRef],
  );
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
          onLoad={glowRef ? paint : undefined}
          sizes={SIZES}
          src={src}
        />
      ) : null}
    </span>
  );
}

/**
 * The card's light: its poster, shrunk to 8 × 12 and stretched over the
 * card (`object-cover`), so the browser's smooth upscale is the blur.
 * A CSS `blur()` gave every card its own compositor pass, redrawn each
 * frame of a scroll; this is a plain image, drawn once, by the poster
 * (`DiaryPoster`'s `glowRef`) when it has loaded.
 */
export function DiaryGlow({ ref }: Readonly<{ ref: Ref<HTMLCanvasElement> }>) {
  return (
    <canvas
      aria-hidden="true"
      className="absolute inset-0 -z-2 size-full object-cover opacity-45"
      height={GLOW_HEIGHT}
      ref={ref}
      width={GLOW_WIDTH}
    />
  );
}
