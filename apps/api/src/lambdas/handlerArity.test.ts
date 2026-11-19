import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

/**
 * Lambda on Node 24 refuses a handler that declares a third parameter (the
 * old callback), even an unused optional one: the function fails at init,
 * before any message. Account deletion and Undo import crashed that way.
 */
const root = fileURLToPath(new URL('.', import.meta.url));
const lambdas = readdirSync(root).filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
);

describe('Lambda handlers', () => {
  it('take at most the event and the context', async () => {
    vi.doMock('sst', () => ({ Resource: {} }));
    const wrong: string[] = [];
    for (const file of lambdas) {
      const module: Record<string, unknown> = await import(`${root}${file}`);
      for (const [name, value] of Object.entries(module)) {
        if (/handler$/i.test(name) && typeof value === 'function') {
          if (value.length > 2) {
            wrong.push(`${file} ${name} takes ${value.length}`);
          }
        }
      }
    }
    expect(lambdas.length).toBeGreaterThan(8);
    expect(wrong).toEqual([]);
    vi.doUnmock('sst');
    // Imports every Lambda's whole module graph: far past the 5s default
    // when the machine is busy
  }, 30_000);
});
