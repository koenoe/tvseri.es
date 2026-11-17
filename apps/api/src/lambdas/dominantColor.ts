import { createFetch } from '@better-fetch/fetch';
import { channelsToHex } from '@tvseri.es/utils';
import type { Handler } from 'aws-lambda';
import sharp from 'sharp';

import { groundColor } from '@/lib/groundColor';
import { survivesSilhouette } from '@/lib/logoSilhouette';

const BLUR_SIGMA = 35;

/**
 * `color` (the default): the image's dominant colour as a page ground.
 * `logo`: whether a network's logo still reads as a white silhouette
 * (`survivesSilhouette`).
 */
type ProcessImageEvent = Readonly<{
  mode?: 'color' | 'logo';
  url: string;
}>;

type ProcessImageResult =
  | Readonly<{ color: string }>
  | Readonly<{ silhouette: boolean }>;

// The API stops waiting for this Lambda after 8s (lib/imageLambda.ts),
// cold start included: one attempt that leaves time for processing
const IMAGE_FETCH_TIMEOUT = 2500;

const $fetch = createFetch({
  timeout: IMAGE_FETCH_TIMEOUT,
});

export const handler: Handler<ProcessImageEvent, ProcessImageResult> = async (
  event,
) => {
  try {
    if (!event.url?.startsWith('http')) {
      throw new Error('Invalid URL provided');
    }

    const { data, error } = await $fetch(event.url);

    if (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }

    // @ts-expect-error - data is `unknown` type
    const imageBuffer = Buffer.from(await data.arrayBuffer());
    if (event.mode === 'logo') {
      // A file sharp can't read won't read next time either: it is answered
      // (drawn white, as before the check) so it is stored, not retried
      const silhouette = await survivesSilhouette(imageBuffer).catch(
        (decodeError: unknown) => {
          console.error('Logo check could not read the image:', decodeError);
          return true;
        },
      );
      return { silhouette };
    }
    const { dominant } = await sharp(imageBuffer)
      .blur(BLUR_SIGMA)
      .raw()
      .stats();
    // The page colour rule (white/60 text at 4.5:1), applied where the
    // colour is detected
    const color = groundColor(
      channelsToHex([dominant.r, dominant.g, dominant.b]),
    );
    if (!color) {
      throw new Error('Invalid dominant color');
    }

    return { color };
  } catch (error) {
    console.error('Image detection failed:', error);
    throw error;
  }
};
