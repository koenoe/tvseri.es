/**
 * Generates the favicon set in src/app from the drawings in
 * apps/web/design/logo (“tv.” on the #1c2223 tile):
 *
 * - `icon.svg`: the 32px drawing (modern browsers, any size)
 * - `favicon.ico`: the tuned 16px drawing + the 32px one in one ICO
 * - `apple-icon.png`: the 180px app icon
 *
 * Re-run after the logo spec changes:
 *
 *   node apps/web/scripts/generate-favicons.mjs
 *
 * Rasterises with sharp, which Next already brings in (resolved through
 * `next`), and packs the ICO with png-to-ico.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import pngToIco from 'png-to-ico';

const root = path.resolve(import.meta.dirname, '../../..');
const source = path.join(root, 'apps/web/design/logo');
const target = path.join(root, 'apps/web/src/app');

const fromNext = createRequire(
  createRequire(import.meta.url).resolve('next/package.json'),
);
const sharp = fromNext('sharp');

const read = (name) => readFileSync(path.join(source, name), 'utf8');

/**
 * The spec files draw with `currentColor` and a `color` style for previews;
 * a favicon has no CSS context, so the glyph is painted white directly.
 */
function standalone(svg) {
  return svg
    .replace(/ class="[^"]*"/, '')
    .replace(/ aria-hidden="true"/, '')
    .replace(/ style="color: #fff;"/, '')
    .replace('fill="currentColor"', 'fill="#fff"')
    .trim();
}

/** Rendered at 4× the target size, then downsampled. */
function png(svg, size) {
  const drawn = Number(/ width="([\d.]+)"/.exec(svg)?.[1] ?? size);
  return sharp(Buffer.from(svg), { density: (72 * 4 * size) / drawn })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const fav16 = standalone(read('favicon-16.svg'))
  // the 16px source draws on a 32 viewBox at width/height 16
  .replace('width="16" height="16"', 'width="32" height="32"');
const fav32 = standalone(read('favicon-32.svg'));
const app180 = standalone(read('apple-icon-180.svg'));

writeFileSync(path.join(target, 'icon.svg'), `${fav32}\n`);
writeFileSync(
  path.join(target, 'favicon.ico'),
  await pngToIco([await png(fav16, 16), await png(fav32, 32)]),
);
writeFileSync(path.join(target, 'apple-icon.png'), await png(app180, 180));

console.log('favicon.ico, icon.svg, apple-icon.png written to', target);
