import {
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

let counter = 0;

const tempPath = (path: string): string => {
  counter += 1;
  return join(
    dirname(path),
    `.tmp-${process.pid}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2)}`,
  );
};

export const ensureDir = (path: string): string => {
  mkdirSync(path, { recursive: true });
  return path;
};

export const readJson = <T>(path: string): T | undefined => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
};

/** Writes JSON so readers never see a half-written file. */
export const writeJsonAtomic = (path: string, data: unknown): void => {
  ensureDir(dirname(path));
  const temp = tempPath(path);
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(temp, path);
};

/**
 * Creates `path` with `data` only if it does not exist yet, atomically and
 * with complete content (hard link of a finished temp file). Returns false
 * when someone else already holds the path.
 */
export const createExclusive = (path: string, data: unknown): boolean => {
  ensureDir(dirname(path));
  const temp = tempPath(path);
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  try {
    linkSync(temp, path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  } finally {
    unlinkSync(temp);
  }
};

export const removeFile = (path: string): boolean => {
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
};

/** JSON files in a directory (sorted by name), skipping temp files. */
export const listJson = (dir: string): readonly string[] => {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
      .sort()
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
};

/**
 * Removes `path` only if it still holds what the caller judged stale, so two
 * cleaners can't delete a fresh claim made in between. Moves the file aside
 * first; puts it back when it changed.
 */
export const removeIfUnchanged = (path: string, expected: unknown): boolean => {
  const aside = tempPath(path);
  try {
    renameSync(path, aside);
  } catch {
    return false;
  }
  const moved: unknown = readJson(aside);
  if (JSON.stringify(moved) === JSON.stringify(expected)) {
    removeFile(aside);
    return true;
  }
  try {
    linkSync(aside, path);
  } catch {
    // Someone claimed the path meanwhile; their claim wins.
  }
  removeFile(aside);
  return false;
};
