import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

/**
 * A Lambda may only read the resources linked to it in infra, and a read at
 * import runs in every Lambda whose bundle merely contains the module (the
 * account deletion Lambda crashed at init on the TMDB key that way). So no
 * module reads `Resource` at import: every read waits for the code that uses
 * it.
 */
const root = fileURLToPath(new URL('.', import.meta.url));
const modules = readdirSync(root, { recursive: true })
  .map(String)
  .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'));

// The 5s default flaked under load: importing every module takes seconds
const SWEEP_TIMEOUT_MS = 30_000;

describe('linked resources', () => {
  it('are never read at import', { timeout: SWEEP_TIMEOUT_MS }, async () => {
    const reads: string[] = [];
    vi.resetModules();
    vi.doMock('sst', () => ({
      Resource: new Proxy(
        {},
        {
          get: (_target, name) => {
            reads.push(String(name));
            throw new Error(`Resource.${String(name)} read at import`);
          },
        },
      ),
    }));

    const failures: string[] = [];
    for (const path of modules) {
      const before = reads.length;
      await import(`${root}${path}`).catch((error: unknown) => {
        failures.push(`${path}: ${String(error)}`);
      });
      if (reads.length > before) {
        failures.push(`${path}: ${reads.slice(before).join(', ')}`);
      }
    }

    expect(modules.length).toBeGreaterThan(100);
    expect(failures).toEqual([]);
    vi.doUnmock('sst');
  });
});
