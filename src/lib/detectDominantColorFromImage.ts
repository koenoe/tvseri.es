import 'server-only';

import Color from 'color';
import { unstable_cache } from 'next/cache';
import sharp from 'sharp';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

const ALGORITHM_VERSION = 'v1'; // Version of the algorithm for cache invalidation
const CONTRAST_MINIMUM = 4.5; // Minimum contrast ratio for accessibility (WCAG)
const BLEND_OPACITY_STEP = 0.05; // Incremental step for darkening colors
const DOMINANT_COLOR_WEIGHT = 0.7; // Weight given to the dominant color (70%)
const AVERAGE_COLOR_WEIGHT = 0.3; // Weight given to the average color (30%)

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

const cachePrefix = `mood-based-color-${ALGORITHM_VERSION}`;

/**
 * Detects a mood-based color from an image URL.
 * @param url The URL of the image to analyze
 * @returns A promise that resolves to the hex code of the detected color
 */
async function detectMoodBasedColorFromImage(url: string): Promise<string> {
  try {
    const imageResponse = await fetch(url);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    const detectColor = async () => {
      const image = sharp(imageBuffer);

      // Get the dominant color using Sharp's built-in method
      const { dominant } = await image.stats();

      // Process the entire image to calculate the average color
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = info.width * info.height;
      let totalR = 0,
        totalG = 0,
        totalB = 0;

      // Calculate the sum of all color channels
      for (let i = 0; i < data.length; i += 3) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
      }

      // Calculate the average color
      const averageColor = {
        r: Math.round(totalR / pixels),
        g: Math.round(totalG / pixels),
        b: Math.round(totalB / pixels),
      };

      // Combine dominant and average colors using weighted average
      const weightedColor = {
        r: Math.round(
          DOMINANT_COLOR_WEIGHT * dominant.r +
            AVERAGE_COLOR_WEIGHT * averageColor.r,
        ),
        g: Math.round(
          DOMINANT_COLOR_WEIGHT * dominant.g +
            AVERAGE_COLOR_WEIGHT * averageColor.g,
        ),
        b: Math.round(
          DOMINANT_COLOR_WEIGHT * dominant.b +
            AVERAGE_COLOR_WEIGHT * averageColor.b,
        ),
      };

      return Color.rgb(weightedColor);
    };

    let hex = DEFAULT_BACKGROUND_COLOR;
    const moodBasedColor = await detectColor();
    if (moodBasedColor) {
      const color = correctContrast(moodBasedColor);
      hex = color.hex();
    }

    return hex;
  } catch (error) {
    console.error('Error in `detectMoodBasedColorFromImage`:', error);
    return DEFAULT_BACKGROUND_COLOR;
  }
}

/**
 * Cached version of the mood-based color detection function.
 * This helps improve performance for repeated requests.
 */
const detectMoodBasedColorFromImageWithCache = unstable_cache(
  async (url: string) => {
    const moodBasedColor = await detectMoodBasedColorFromImage(url);
    return moodBasedColor;
  },
  [cachePrefix],
);

export default detectMoodBasedColorFromImageWithCache;
