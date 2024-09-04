import 'server-only';

import Color from 'color';
import { unstable_cache } from 'next/cache';
import sharp from 'sharp';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

// Algorithm version - increment this when making significant changes
const ALGORITHM_VERSION = 4;

// Constants for color detection and processing
const CONTRAST_MINIMUM = 4.5; // Minimum contrast ratio for accessibility (WCAG)
const BLEND_OPACITY_STEP = 0.05; // Incremental step for darkening colors
const COLOR_BUCKETS = 36; // Number of buckets for color quantization
const TOP_COLORS_TO_CONSIDER = 8; // Number of top colors to use in weighted average
const SATURATION_WEIGHT = 1.2; // Slight emphasis on more saturated colors
const LIGHTNESS_RANGE = [10, 90]; // Consider a wide range of lightness values

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

/**
 * Converts RGB color values to HSL color space.
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Array of [h, s, l] values
 */
const rgbToHsl = (
  r: number,
  g: number,
  b: number,
): [number, number, number] => {
  const color = Color.rgb(r, g, b);
  const hsl = color.hsl().array();
  return [hsl[0], hsl[1], hsl[2]];
};

/**
 * Converts HSL color values to RGB color space.
 * @param h Hue value (0-360)
 * @param s Saturation value (0-100)
 * @param l Lightness value (0-100)
 * @returns Array of [r, g, b] values (0-255)
 */
const hslToRgb = (
  h: number,
  s: number,
  l: number,
): [number, number, number] => {
  const color = Color.hsl(h, s, l);
  const rgb = color.rgb().array();
  return [rgb[0], rgb[1], rgb[2]];
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

    // Analyze all pixels and quantize colors in HSL space
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [h, s, l] = rgbToHsl(r, g, b);

      // Skip colors that are too light or too dark
      if (l < LIGHTNESS_RANGE[0] || l > LIGHTNESS_RANGE[1]) continue;

      const quantH =
        Math.round(h / (360 / COLOR_BUCKETS)) * (360 / COLOR_BUCKETS);
      const quantS =
        Math.round(s / (100 / COLOR_BUCKETS)) * (100 / COLOR_BUCKETS);
      const quantL =
        Math.round(l / (100 / COLOR_BUCKETS)) * (100 / COLOR_BUCKETS);

      const key = `${quantH},${quantS},${quantL}`;
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
      const [h, s, l] = key.split(',').map(Number);

      // Calculate color weight
      let weight = Math.pow(count / totalPixels, 0.7); // Frequency weight
      weight *= Math.pow(s / 100, SATURATION_WEIGHT); // Saturation weight

      weightedSum[0] += h * weight;
      weightedSum[1] += s * weight;
      weightedSum[2] += l * weight;
      totalWeight += weight;
    }

    const averageHsl = weightedSum.map((sum) => sum / totalWeight);
    const [r, g, b] = hslToRgb(...(averageHsl as [number, number, number]));

    // Apply contrast correction
    const detectedColor = Color.rgb(
      Math.round(r),
      Math.round(g),
      Math.round(b),
    );
    console.log(detectedColor.hex());
    const correctedColor = correctContrast(detectedColor);

    return correctedColor.hex();
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
