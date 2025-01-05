import { type Handler } from 'aws-lambda';

import { createFetch } from '@better-fetch/fetch';
import Color from 'color';
import sharp from 'sharp';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';

const BLUR_SIGMA = 35;
const CONTRAST_MINIMUM = 4.5;
const BLEND_OPACITY_STEP = 0.05;

type ProcessImageEvent = Readonly<{
  url: string;
}>;

type ProcessImageResult = Readonly<{
  color: string;
}>;

const $fetch = createFetch({
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
});

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

export const handler: Handler<ProcessImageEvent, ProcessImageResult> = async (
  event,
) => {
  try {
    if (!event.url || !event.url.startsWith('http')) {
      throw new Error('Invalid URL provided');
    }

    const { data, error } = await $fetch(event.url);

    if (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }

    const imageBuffer = Buffer.from(await data.arrayBuffer());
    const { dominant } = await sharp(imageBuffer)
      .blur(BLUR_SIGMA)
      .raw()
      .stats();
    const dominantColor = Color.rgb(dominant);
    const correctedColor = correctContrast(dominantColor);

    return {
      color: correctedColor.hex(),
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};
