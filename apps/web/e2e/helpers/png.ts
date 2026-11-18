import { deflateSync } from 'node:zlib';

import type { BrowserContext } from '@playwright/test';

import { TRENDING } from '../fixtures/home/core.ts';

/** CRC-32 (PNG's chunk checksum) */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (bytes: Buffer) => {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
};

/** A transparent PNG of `width` × `height` px: an image with a natural size to lay out */
export function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** TMDB's w500: the width a logo file loads at */
const LOGO_WIDTH = 500;

/**
 * Answers the trending logos (TMDB URLs, which never load on the rig) with
 * files of their fixture's aspect ratio, `titleTreatmentAspectRatio`, at
 * TMDB's w500, so the spotlight lays them out as it would a real logo
 * instead of a broken image's alt text. Other images are left alone.
 */
export async function routeTrendingLogos(context: BrowserContext) {
  const ratios = new Map(
    TRENDING.flatMap((series) =>
      series.titleTreatmentImage && series.titleTreatmentAspectRatio
        ? [[series.titleTreatmentImage, series.titleTreatmentAspectRatio]]
        : [],
    ),
  );
  await context.route('https://image.tmdb.org/**', (route) => {
    const ratio = ratios.get(route.request().url());
    return ratio
      ? route.fulfill({
          body: png(LOGO_WIDTH, Math.round(LOGO_WIDTH / ratio)),
          contentType: 'image/png',
        })
      : route.fallback();
  });
}

/** A one-pixel PNG for every TMDB image, so backdrops load and decode locally */
export async function routeImages(context: BrowserContext) {
  const pixel = png(1, 1);
  await context.route('https://image.tmdb.org/**', (route) =>
    route.fulfill({ body: pixel, contentType: 'image/png' }),
  );
}
