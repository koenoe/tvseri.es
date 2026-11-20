/**
 * Zips apps/extension into public/ for /extension's manual install. Runs
 * before every `next build`, so each deploy serves the extension it was
 * built with. `--dev` (the `dev` script) also writes apps/extension/dev-build/,
 * the copy that talks to localhost:3000. `--store` only writes the Chrome
 * Web Store's upload (no manifest key) to apps/extension/store-build/.
 *
 *   node apps/web/scripts/extension-zip.ts [--dev | --store]
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildExtensionZip,
  buildStoreZip,
  DEV_FOLDER,
  STORE_FOLDER,
  writeDevExtension,
} from '../src/lib/extension/extensionZip.ts';

const web = path.resolve(import.meta.dirname, '..');
const extension = path.resolve(web, '../extension');
const out = path.join(web, 'public');

if (process.argv.includes('--store')) {
  const store = buildStoreZip(extension);
  const folder = path.join(extension, STORE_FOLDER);
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, store.fileName), store.bytes);
  console.log(`Wrote apps/extension/${STORE_FOLDER}/${store.fileName}`);
  process.exit(0);
}

const { bytes, fileName } = buildExtensionZip(extension);
mkdirSync(out, { recursive: true });
// An older version's zip would otherwise be served beside the new one
for (const old of readdirSync(out)) {
  if (/^tvseries-extension-.+\.zip$/.test(old)) {
    rmSync(path.join(out, old));
  }
}
writeFileSync(path.join(out, fileName), bytes);
console.log(`Wrote public/${fileName} (${bytes.byteLength} bytes)`);

if (process.argv.includes('--dev')) {
  writeDevExtension(extension, path.join(extension, DEV_FOLDER));
  console.log(
    `Wrote apps/extension/${DEV_FOLDER} (the extension for localhost:3000)`,
  );
}
