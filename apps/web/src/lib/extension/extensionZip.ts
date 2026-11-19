import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { strToU8, type Zippable, zipSync } from 'fflate';

import { extensionZipName } from './release.ts';

/** A fixed date for every entry, so the same files always zip to the same bytes */
const MTIME = new Date('2026-01-01T00:00:00Z');

/**
 * The dev copy `pnpm dev` writes inside apps/extension: a visible name, so
 * macOS's folder picker shows it for Load unpacked
 */
export const DEV_FOLDER = 'dev-build';

/** Sorted, `/`-separated, without dotfiles or the dev copy, so the zip is stable */
function filesIn(dir: string): ReadonlyArray<string> {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .flatMap((entry) => {
      if (!entry.isFile()) {
        return [];
      }
      const parts = path
        .relative(dir, path.join(entry.parentPath, entry.name))
        .split(path.sep);
      return parts[0] === DEV_FOLDER ||
        parts.some((part) => part.startsWith('.'))
        ? []
        : [parts.join('/')];
    })
    .sort();
}

/**
 * The manual install's zip. No wrapper folder, so the unzipped folder is the
 * one Load unpacked takes.
 */
export function buildExtensionZip(
  dir: string,
): Readonly<{ bytes: Uint8Array; fileName: string }> {
  const { version } = JSON.parse(
    readFileSync(path.join(dir, 'manifest.json'), 'utf8'),
  ) as Readonly<{ version?: unknown }>;
  if (typeof version !== 'string') {
    throw new Error('The extension’s manifest has no version');
  }
  const entries: Zippable = {};
  for (const file of filesIn(dir)) {
    entries[file] = [
      readFileSync(path.join(dir, file)),
      { level: 9, mtime: MTIME },
    ];
  }
  return { bytes: zipSync(entries), fileName: extensionZipName(version) };
}

/** What origins.js says in the source, and what the dev copy says instead */
const SITE_LINE = 'export const SITE_ORIGIN = PRODUCTION_ORIGIN;';
const DEV_ORIGIN = 'http://localhost:3000';
const PRODUCTION_PATTERN = 'https://www.tvseri.es/*';
const DEV_PATTERN = `${DEV_ORIGIN}/*`;

type Manifest = Readonly<{
  externally_connectable?: Readonly<{ matches?: ReadonlyArray<string> }>;
  host_permissions?: ReadonlyArray<string>;
  name?: string;
}>;

const toDev = (patterns: ReadonlyArray<string> = []) =>
  patterns.map((pattern) =>
    pattern === PRODUCTION_PATTERN ? DEV_PATTERN : pattern,
  );

/**
 * Points at localhost:3000 and is renamed so it can't be mistaken for the
 * real one. The key stays: it fixes the id the site messages.
 */
function devManifest(manifest: Manifest): string {
  const dev = {
    ...manifest,
    externally_connectable: {
      ...manifest.externally_connectable,
      matches: toDev(manifest.externally_connectable?.matches),
    },
    host_permissions: toDev(manifest.host_permissions),
    name: `${manifest.name ?? 'tvseri.es'} (localhost)`,
  };
  return `${JSON.stringify(dev, null, 2)}\n`;
}

/**
 * The unpacked copy a developer loads while `pnpm dev` runs. Written fresh
 * each time, so a file deleted from the source never lingers.
 */
export function writeDevExtension(dir: string, out: string): void {
  const origins = readFileSync(path.join(dir, 'origins.js'), 'utf8');
  if (origins.split(SITE_LINE).length !== 2) {
    throw new Error(
      `origins.js must hold "${SITE_LINE}" once: the dev copy rewrites that SITE_ORIGIN line`,
    );
  }
  const manifest = JSON.parse(
    readFileSync(path.join(dir, 'manifest.json'), 'utf8'),
  ) as Manifest;
  const rewritten: Readonly<Record<string, Uint8Array>> = {
    'manifest.json': strToU8(devManifest(manifest)),
    'origins.js': strToU8(
      origins.replace(SITE_LINE, `export const SITE_ORIGIN = '${DEV_ORIGIN}';`),
    ),
  };
  rmSync(out, { force: true, recursive: true });
  for (const file of filesIn(dir)) {
    const target = path.join(out, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(
      target,
      rewritten[file] ?? readFileSync(path.join(dir, file)),
    );
  }
}
