import type { LastImport } from '@tvseri.es/schemas';

import { fetchJson } from '@/lib/series/useCachedJson';

/**
 * The viewer's last import as the API has it now (null: none), or undefined
 * when it couldn't be read (signed out, an outage): the Undo poll then asks
 * again, and a failed read never passes for "no import".
 */
export async function readLastImport(): Promise<LastImport | null | undefined> {
  try {
    const { lastImport } = await fetchJson<
      Readonly<{ lastImport: LastImport | null }>
    >('/api/me/import-status');
    return lastImport;
  } catch {
    return undefined;
  }
}
