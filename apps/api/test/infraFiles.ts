import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const INFRA = fileURLToPath(new URL('../../../infra', import.meta.url));

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });

/** Every TypeScript file under infra/, with its source */
export const infraSources = () =>
  walk(INFRA).map((path) => ({ path, source: readFileSync(path, 'utf8') }));
