import 'server-only';

import vision from '@google-cloud/vision';
import { kv } from '@vercel/kv';
import Color from 'color';
import { GoogleAuth, grpc } from 'google-gax';
import { unstable_cache } from 'next/cache';

const CONTRAST_MINIMUM = 4.5; // Minimum contrast ratio recommended by WCAG
const BLEND_OPACITY_STEP = 0.05; // Step to blend black into the color

const correctContrast = (input: Color): Color => {
  // Make sure the output color has enough contrast with white according to WCAG
  let output = input;

  while (output.contrast(Color('white')) < CONTRAST_MINIMUM) {
    // Manual blend with black
    const rgb = output.rgb().object();
    const blendedR = Math.round(rgb.r * (1 - BLEND_OPACITY_STEP));
    const blendedG = Math.round(rgb.g * (1 - BLEND_OPACITY_STEP));
    const blendedB = Math.round(rgb.b * (1 - BLEND_OPACITY_STEP));

    output = Color.rgb(blendedR, blendedG, blendedB);
  }

  return output;
};

const getApiKeyCredentials = () => {
  const sslCreds = grpc.credentials.createSsl();
  const googleAuth = new GoogleAuth();
  const authClient = googleAuth.fromAPIKey(
    String(process.env.GOOGLE_CLOUD_API_KEY),
  );
  const credentials = grpc.credentials.combineChannelCredentials(
    sslCreds,
    grpc.credentials.createFromGoogleCredential(authClient),
  );
  return credentials;
};

const sslCreds = getApiKeyCredentials();
const client = new vision.ImageAnnotatorClient({ sslCreds });
const cachePrefix = 'dominant-color';

async function detectDominantColorFromImage(url: string): Promise<string> {
  try {
    const imageResponse = await fetch(url);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBytes = Buffer.from(imageArrayBuffer);
    const [data] = await client.imageProperties(imageBytes);
    const imageProperties = data?.imagePropertiesAnnotation;
    const dominantColors = (imageProperties?.dominantColors?.colors ?? []).sort(
      (a, b) => (b.pixelFraction ?? 0) - (a.pixelFraction ?? 0),
    );
    const closestColor = dominantColors[0];

    let hex = '#000000';
    if (closestColor) {
      const color = correctContrast(
        Color.rgb(
          closestColor.color?.red ?? 0,
          closestColor.color?.green ?? 0,
          closestColor.color?.blue ?? 0,
        ),
      );
      hex = color.hex();
    }

    return hex;
  } catch (error) {
    console.error('detectDominantColorFromImage', error);
    return '#000000';
  }
}

const detectDominantColorFromImageWithCache = unstable_cache(
  async (url: string) => {
    // Note: this is mostly a workaround to prevent a lot of requests to the Vision API
    // during development. In production just the `unstable_cache` should be sufficient
    try {
      const cacheKey = `${cachePrefix}:${url}`;
      const dominantColorFromKV = await kv.get<string>(cacheKey);
      if (dominantColorFromKV) {
        return dominantColorFromKV;
      }

      const dominantColor = await detectDominantColorFromImage(url);

      await kv.set(cacheKey, dominantColor, {
        ex: 31536000, // 365 days
      });

      return dominantColor;
    } catch (error) {
      return detectDominantColorFromImage(url);
    }
  },
  [cachePrefix],
  {
    revalidate: 31536000, // 365 days
  },
);

export default detectDominantColorFromImageWithCache;
