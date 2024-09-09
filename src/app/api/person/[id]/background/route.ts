import { unstable_cache } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { fetchPersonImages } from '@/lib/tmdb';

const MAX_CACHE_SIZE = 1.5 * 1024 * 1024; // 1.9MB to be safe

async function fetchAndProcessImages(personId: number) {
  const personImages = await fetchPersonImages(personId);

  if (!personImages || personImages.length === 0) {
    throw new Error('No images found');
  }

  const imagePromises = personImages.slice(0, 4).map(fetchImage);
  return Promise.all(imagePromises);
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processImage(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Failed to get image metadata');
  }
  const aspectRatio = metadata.width / metadata.height;

  let resizeOptions,
    extractLeft = 0,
    extractTop = 0;

  if (aspectRatio > targetWidth / targetHeight) {
    resizeOptions = { height: targetHeight };
    const resizedWidth = Math.round(targetHeight * aspectRatio);
    extractLeft = Math.round((resizedWidth - targetWidth) / 2);
  } else {
    resizeOptions = { width: targetWidth };
    const resizedHeight = Math.round(targetWidth / aspectRatio);
    extractTop = Math.round((resizedHeight - targetHeight) / 2);
  }

  return image
    .resize(resizeOptions)
    .extract({
      width: targetWidth,
      height: targetHeight,
      left: extractLeft,
      top: extractTop,
    })
    .toBuffer();
}

async function createComposite(
  images: Buffer[],
  targetWidth: number,
  targetHeight: number,
) {
  const imageWidth = targetWidth / 4;

  const processedImages = await Promise.all(
    images.map((img) => processImage(img, imageWidth, targetHeight)),
  );

  let compositeImage = sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  }).composite(
    processedImages.map((image, index) => ({
      input: image,
      top: 0,
      left: index * imageWidth,
    })),
  );

  let quality = 80;
  let outputBuffer: Buffer;

  do {
    outputBuffer = await compositeImage.webp({ quality }).toBuffer();

    if (outputBuffer.length > MAX_CACHE_SIZE) {
      quality -= 5;
    }
  } while (outputBuffer.length > MAX_CACHE_SIZE && quality > 0);

  return outputBuffer;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const personId = parseInt(params.id, 10);

  const getCachedBackground = unstable_cache(
    async () => {
      const images = await fetchAndProcessImages(personId);
      return createComposite(images, 1920, 1080);
    },
    [`person-background-${personId}`],
    { revalidate: 86400 },
  );

  try {
    const outputBuffer = await getCachedBackground();
    const etag = `"${Buffer.from(outputBuffer).toString('base64').substring(0, 27)}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error('Error processing images:', error);
    return new NextResponse('Error processing images', { status: 500 });
  }
}
