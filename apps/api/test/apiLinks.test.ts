import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const INFRA_API = fileURLToPath(
  new URL('../../../infra/api.ts', import.meta.url),
);

const resolveImport = (from: string, specifier: string) => {
  const base = specifier.startsWith('@/')
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) {
    return null;
  }
  return (
    [`${base}.ts`, join(base, 'index.ts'), base].find(
      (path) => path.endsWith('.ts') && existsSync(path),
    ) ?? null
  );
};

/** Every `Resource.X` the API's own modules (from its handler) read */
const resourcesReadFrom = (entry: string) => {
  const seen = new Set<string>();
  const read = new Set<string>();
  const visit = (path: string) => {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    const source = readFileSync(path, 'utf8');
    for (const [, name] of source.matchAll(/\bResource\.(\w+)/g)) {
      read.add(name!);
    }
    for (const [, specifier] of source.matchAll(
      /\b(?:from|import)\s*\(?\s*'([^']+)'/g,
    )) {
      const next = resolveImport(path, specifier!);
      if (next) {
        visit(next);
      }
    }
  };
  visit(entry);
  return read;
};

/** The `link: [...]` of the API functions' shared arguments in infra/api.ts */
const apiLinks = () => {
  const source = readFileSync(INFRA_API, 'utf8');
  const args = source.slice(source.indexOf('const apiFunctionArgs'));
  const list = args.slice(args.indexOf('link: ['), args.indexOf('],'));
  return [...list.matchAll(/^\s*([\w.]+),/gm)].map(([, link]) => link);
};

// A link is a permission as well as a value: the API keeps only the ones its
// code reads (another Lambda that needs a resource links it itself)
describe('the API functions link only what they read', () => {
  it('never sends email and never touches the raw metrics table', () => {
    const read = resourcesReadFrom(join(SRC, 'index.ts'));
    expect(read.has('Users')).toBe(true);
    expect(read.has('Email')).toBe(false);
    expect(read.has('MetricsRaw')).toBe(false);

    expect(apiLinks()).toContain('dynamo.users');
    expect(apiLinks()).not.toContain('email');
    expect(apiLinks()).not.toContain('dynamo.metricsRaw');
  });
});
