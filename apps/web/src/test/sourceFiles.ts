import { readdirSync } from 'node:fs';
import path from 'node:path';

/** The app's source files under `dir`, tests left out, for tests that scan the source */
export const sourceFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')
      ? [full]
      : [];
  });
