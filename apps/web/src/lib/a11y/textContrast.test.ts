import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Informative text is at least white at 60%: the level that
 * keeps 4.5:1 against every page colour. A class below it is allowed only
 * where it isn't informative text (a decorative mark or icon, a disabled
 * state, the style guide's sample of the step), and only that use: mark it
 * with `contrast-exempt: <reason>` on its line or the line above (a line
 * comment, or a JSX comment). Another low class in the same file still
 * fails.
 */
const MARKER = /contrast-exempt:\s*\S/;

const SRC = fileURLToPath(new URL('../..', import.meta.url));
const LOW = /\btext-white\/([1-5]?[0-9])(?![0-9])/g;

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });

type Use = Readonly<{
  file: string;
  line: number;
  exempt: boolean;
  text: string;
}>;

/** Every low step in the app, with whether its line (or the one above) carries the marker */
const lowUses = (): ReadonlyArray<Use> =>
  sources(SRC).flatMap((path) => {
    const file = relative(SRC, path);
    const lines = readFileSync(path, 'utf8').split('\n');
    return lines.flatMap((text, index) =>
      [...text.matchAll(LOW)]
        .filter((match) => Number(match[1]) < 60)
        .map((match) => ({
          exempt: MARKER.test(text) || MARKER.test(lines[index - 1] ?? ''),
          file,
          line: index + 1,
          text: match[0],
        })),
    );
  });

describe('text contrast floor', () => {
  it('keeps informative text at white/60 or more', () => {
    const offenders = lowUses()
      .filter((use) => !use.exempt)
      .map((use) => `${use.file}:${use.line}: ${use.text}`);
    expect(offenders).toEqual([]);
  });

  it('lists no exemption marker that has no low step next to it', () => {
    const marked = new Set(
      lowUses()
        .filter((use) => use.exempt)
        .flatMap((use) => [
          `${use.file}:${use.line}`,
          `${use.file}:${use.line - 1}`,
        ]),
    );
    const stale = sources(SRC).flatMap((path) => {
      const file = relative(SRC, path);
      return readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((text, index) =>
          MARKER.test(text) && !marked.has(`${file}:${index + 1}`)
            ? [`${file}:${index + 1}`]
            : [],
        );
    });
    expect(stale).toEqual([]);
  });
});
