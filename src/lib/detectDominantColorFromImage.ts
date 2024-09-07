import 'server-only';

import Color from 'color';
import { unstable_cache } from 'next/cache';
import sharp from 'sharp';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

const CONTRAST_MINIMUM = 4.5; // Minimum contrast ratio for accessibility (WCAG)
const BLEND_OPACITY_STEP = 0.05; // Incremental step for darkening colors

/**
 * Adjusts the input color to ensure sufficient contrast with white.
 * @param input The input Color object
 * @returns A new Color object with corrected contrast
 */
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

const cachePrefix = 'dominant-color-with-sharp';

async function detectDominantColorFromImage(url: string): Promise<string> {
  try {
    const imageResponse = await fetch(url);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    const image = sharp(imageBuffer);
    const { dominant } = await image.stats();

    const dominantColor = Color.rgb(dominant);
    const correctedColor = correctContrast(dominantColor);

    return correctedColor.hex();
  } catch (error) {
    console.error('Error in detectMoodBasedColorFromImage:', error);
    return DEFAULT_BACKGROUND_COLOR;
  }
}

const detectDominantColorFromImageWithCache = unstable_cache(
  async (url: string) => {
    const dominantColor = await detectDominantColorFromImage(url);
    return dominantColor;
  },
  [cachePrefix],
);

export default detectDominantColorFromImageWithCache;
