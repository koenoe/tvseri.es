import { describe, expect, it } from 'vitest';

import { infraSources } from './infraFiles';

/** Code only: block and line comments removed (not `https://` in strings) */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The text of the object literal that opens at `start` (a `{`) */
const block = (source: string, start: number) => {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
};

// SST prints a function's URL after every deploy (its `_hint`), and the
// deploy logs of this public repo are public. For a function with
// `url: true` that is the raw *.lambda-url address, which skips CloudFront,
// its API-key check and the kill switches. Routed through the Router, the
// printed URL is the Router's. A function that needs its own URL creates it
// with aws.lambda.FunctionUrl (infra/api.ts), which prints nothing.
describe('function URLs in infra/', () => {
  it('are never printed raw: no `url: true`, every `url: {…}` goes through the Router', () => {
    const printed = infraSources().flatMap(({ path, source: raw }) => {
      const source = code(raw);
      return [...source.matchAll(/\burl:\s*(true|\{)/g)]
        .filter(
          (match) =>
            match[1] === 'true' ||
            !/\brouter:/.test(
              block(source, (match.index ?? 0) + match[0].length - 1),
            ),
        )
        .map((match) => `${path}: ${match[0]}`);
    });
    expect(printed).toEqual([]);
  });
});
