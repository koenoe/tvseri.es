import 'server-only';

import Color from 'color';
import { unstable_cache } from 'next/cache';
import sharp from 'sharp';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

// Algorithm version - increment this when making significant changes
const ALGORITHM_VERSION = 2;

// Constants for color detection
const COLOR_BUCKETS = 32; // Number of buckets for color quantization
const TOP_COLORS_TO_CONSIDER = 5; // Number of top colors to use in weighted average

/**
 * Converts RGB color values to LAB color space.
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Array of [L, a, b] values
 */
const rgbToLab = (
  r: number,
  g: number,
  b: number,
): [number, number, number] => {
  const color = Color.rgb(r, g, b);
  const lab = color.lab().array();
  return [lab[0], lab[1], lab[2]];
};

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

    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const colorMap = new Map<string, number>();
    const totalPixels = info.width * info.height;

    // Analyze all pixels and quantize colors in LAB space
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [l, a, b_] = rgbToLab(r, g, b);

      const quantL =
        Math.round(l / (100 / COLOR_BUCKETS)) * (100 / COLOR_BUCKETS);
      const quantA =
        Math.round((a + 128) / (256 / COLOR_BUCKETS)) * (256 / COLOR_BUCKETS) -
        128;
      const quantB =
        Math.round((b_ + 128) / (256 / COLOR_BUCKETS)) * (256 / COLOR_BUCKETS) -
        128;

      const key = `${quantL},${quantA},${quantB}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    const sortedColors = Array.from(colorMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    // Calculate weighted average of top colors
    let totalWeight = 0;
    const weightedSum = [0, 0, 0];

    for (
      let i = 0;
      i < Math.min(TOP_COLORS_TO_CONSIDER, sortedColors.length);
      i++
    ) {
      const [key, count] = sortedColors[i];
      const [l, a, b] = key.split(',').map(Number);
      const weight = count / totalPixels;

      weightedSum[0] += l * weight;
      weightedSum[1] += a * weight;
      weightedSum[2] += b * weight;
      totalWeight += weight;
    }

    const averageLab = weightedSum.map((sum) => sum / totalWeight);
    const resultColor = Color.lab(averageLab[0], averageLab[1], averageLab[2]);

    return resultColor.hex();
  } catch (error) {
    console.error('Error in detectMoodBasedColorFromImage:', error);
    return DEFAULT_BACKGROUND_COLOR;
  }
}

const cachePrefix = `mood-based-color-v${ALGORITHM_VERSION}`;

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
