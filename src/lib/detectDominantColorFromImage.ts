import 'server-only';

import { cache } from 'react';

import Color from 'color';
import { unstable_cache } from 'next/cache';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

const CONTRAST_MINIMUM = 4.5; // Minimum contrast ratio for accessibility (WCAG)
const BLEND_OPACITY_STEP = 0.05; // Incremental step for darkening colors
const BLUR_SIGMA = 35; // Blur intensity for dominant color detection

const correctContrast = (input: Color): Color => {
  let output = input;
  while (output.contrast(Color('white')) < CONTRAST_MINIMUM) {
    const rgb = output.rgb().object();
    const blendedR = Math.round(rgb.r * (1 - BLEND_OPACITY_STEP));
    const blendedG = Math.round(rgb.g * (1 - BLEND_OPACITY_STEP));
    const blendedB = Math.round(rgb.b * (1 - BLEND_OPACITY_STEP));
    output = Color.rgb(blendedR, blendedG, blendedB);
  }
  return output;
};

const cachePrefix = 'dominant-color-with-sharp-blur';

async function detectDominantColorFromImage(url: string): Promise<string> {
  try {
    const sharp = (await import('sharp')).default;
    const imageResponse = await fetch(url);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const image = sharp(imageBuffer);
    const blurredImage = await image.blur(BLUR_SIGMA).toBuffer();
    const { dominant } = await sharp(blurredImage).stats();
    const dominantColor = Color.rgb(dominant);
    const correctedColor = correctContrast(dominantColor);

    return correctedColor.hex();
  } catch (error) {
    console.error('Error in detectDominantColorFromImage:', error);
    return DEFAULT_BACKGROUND_COLOR;
  }
}

const detectDominantColorFromImageWithCache = cache(async (url: string) =>
  unstable_cache(async () => {
    const dominantColor = await detectDominantColorFromImage(url);
    return dominantColor;
  }, [cachePrefix, url])(),
);

export default detectDominantColorFromImageWithCache;
