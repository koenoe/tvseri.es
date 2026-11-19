/**
 * Zips apps/extension into public/ for /extension's manual install. Runs
 * before every `next build`, so each deploy serves the extension it was
 * built with. `--dev` (the `dev` script) also writes apps/extension/dev-build/,
 * the copy that talks to localhost:3000.
 *
 *   node apps/web/scripts/extension-zip.ts [--dev]
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildExtensionZip,
  DEV_FOLDER,
  writeDevExtension,
} from '../src/lib/extension/extensionZip.ts';

const web = path.resolve(import.meta.dirname, '..');
const extension = path.resolve(web, '../extension');
const out = path.join(web, 'public');

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
