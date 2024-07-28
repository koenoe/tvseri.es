import 'server-only';

import vision from '@google-cloud/vision';
import { GoogleAuth, grpc } from 'google-gax';
import Color from 'color';
import { kv } from '@vercel/kv';

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
const cachePrefix = 'dominant-color:';

export default async function detectDominantColorFromImage(
  url: string,
): Promise<string> {
  try {
    const cacheKey = `${cachePrefix}${url}`;
    const dominantColorFromCache = await kv.get<string>(cacheKey);
    if (dominantColorFromCache) {
      return dominantColorFromCache;
    }

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
      const color = Color.rgb(
        closestColor.color?.red ?? 0,
        closestColor.color?.green ?? 0,
        closestColor.color?.blue ?? 0,
      );
      hex = color.hex();
    }

    await kv.set(cacheKey, hex, { ex: 31536000 }); // 365 days

    return hex;
  } catch (error) {
    console.error('detectDominantColorFromImage', error);
    return '#000000';
  }
}
