import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import {
  buildExtensionZip,
  buildStoreZip,
  DEV_FOLDER,
  writeDevExtension,
} from './extensionZip';

const REAL_EXTENSION = fileURLToPath(
  new URL('../../../../extension', import.meta.url),
);

/** A folder shaped like apps/extension */
function extensionFolder(
  version: string,
  manifest: Readonly<Record<string, unknown>> = {},
): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'extension-'));
  writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({ key: 'MIIB', name: 'tvseri.es', version, ...manifest }),
  );
  writeFileSync(path.join(dir, 'popup.js'), 'console.log(1);');
  mkdirSync(path.join(dir, 'icons', 'services'), { recursive: true });
  writeFileSync(path.join(dir, 'icons', 'services', 'bbc.svg'), '<svg/>');
  writeFileSync(path.join(dir, '.DS_Store'), 'finder');
  mkdirSync(path.join(dir, DEV_FOLDER));
  writeFileSync(path.join(dir, DEV_FOLDER, 'manifest.json'), '{}');
  return dir;
}

describe('buildExtensionZip', () => {
  it('names the zip after the manifest’s version', () => {
    expect(buildExtensionZip(extensionFolder('0.4.1')).fileName).toBe(
      'tvseries-extension-0.4.1.zip',
    );
  });

  it('holds every file at the zip’s root, the manifest’s key kept, no dev copy', () => {
    const { bytes } = buildExtensionZip(extensionFolder('0.1.0'));
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      'icons/services/bbc.svg',
      'manifest.json',
      'popup.js',
    ]);
    const manifest = JSON.parse(
      strFromU8(files['manifest.json'] ?? new Uint8Array()),
    );
    expect(manifest).toEqual({
      key: 'MIIB',
      name: 'tvseri.es',
      version: '0.1.0',
    });
  });

  it('builds the store’s upload without the key: the store gives its own', () => {
    const { bytes, fileName } = buildStoreZip(extensionFolder('0.1.0'));
    expect(fileName).toBe('tvseries-extension-0.1.0-store.zip');
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      'icons/services/bbc.svg',
      'manifest.json',
      'popup.js',
    ]);
    expect(
      JSON.parse(strFromU8(files['manifest.json'] ?? new Uint8Array())),
    ).toEqual({ name: 'tvseri.es', version: '0.1.0' });
  });

  it('names no local server anywhere in the real extension’s shipped manifest', () => {
    const { bytes } = buildExtensionZip(REAL_EXTENSION);
    const manifest = strFromU8(
      unzipSync(bytes)['manifest.json'] ?? new Uint8Array(),
    );
    expect(manifest).toContain('https://www.tvseri.es/*');
    expect(manifest).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  // The README may name localhost (how to develop); nothing that runs may
  it('names no local server in any shipped script or page', () => {
    const files = unzipSync(buildExtensionZip(REAL_EXTENSION).bytes);
    const code = Object.entries(files).filter(([name]) =>
      /\.(js|html|json)$/.test(name),
    );
    expect(code.length).toBeGreaterThan(3);
    for (const [name, bytes] of code) {
      expect(strFromU8(bytes), name).not.toMatch(/localhost|127\.0\.0\.1/);
    }
  });

  it('is the same bytes for the same files, so a rebuild changes nothing', () => {
    const dir = extensionFolder('0.1.0');
    expect(buildExtensionZip(dir).bytes).toEqual(buildExtensionZip(dir).bytes);
  });
});

describe('writeDevExtension', () => {
  const devCopy = () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'dev-')), DEV_FOLDER);
    writeDevExtension(REAL_EXTENSION, out);
    return out;
  };

  it('targets localhost:3000 only: it answers, and posts to, no other site', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(devCopy(), 'manifest.json'), 'utf8'),
    );
    expect(manifest.externally_connectable.matches).toEqual([
      'http://localhost:3000/*',
    ]);
    expect(manifest.host_permissions).toContain('http://localhost:3000/*');
    expect(JSON.stringify(manifest)).not.toContain('tvseri.es/*');
    // The same key: the id the site messages
    expect(manifest.key).toMatch(/^MIIB/);
  });

  it('links against localhost, and still knows it isn’t www.tvseri.es', async () => {
    const { allowedOrigin, PRODUCTION_ORIGIN, SITE_ORIGIN } = (await import(
      pathToFileURL(path.join(devCopy(), 'origins.js')).href
    )) as Readonly<{
      allowedOrigin: (origin: string) => boolean;
      PRODUCTION_ORIGIN: string;
      SITE_ORIGIN: string;
    }>;
    expect(SITE_ORIGIN).toBe('http://localhost:3000');
    expect(PRODUCTION_ORIGIN).toBe('https://www.tvseri.es');
    expect(allowedOrigin('http://localhost:3000')).toBe(true);
    expect(allowedOrigin('https://www.tvseri.es')).toBe(false);
  });

  it('carries every other file as is, and starts clean each time', () => {
    const out = devCopy();
    writeFileSync(path.join(out, 'stale.js'), 'old');
    writeDevExtension(REAL_EXTENSION, out);
    expect(existsSync(path.join(out, 'stale.js'))).toBe(false);
    expect(readFileSync(path.join(out, 'popup.js'), 'utf8')).toBe(
      readFileSync(path.join(REAL_EXTENSION, 'popup.js'), 'utf8'),
    );
  });

  it('refuses a source whose site line it can’t find', () => {
    const dir = extensionFolder('0.1.0');
    writeFileSync(path.join(dir, 'origins.js'), 'export const X = 1;');
    expect(() => writeDevExtension(dir, path.join(dir, DEV_FOLDER))).toThrow(
      /SITE_ORIGIN/,
    );
  });
});
