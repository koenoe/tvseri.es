import type { LastImport } from '@tvseri.es/schemas';

/**
 * Episodes from the import that are in the history now: the ones it added
 * plus the ones that were there already. The result card and the sidebar
 * line both show this number.
 */
export const importedEpisodes = (last: LastImport): number =>
  last.written + (last.skipped ?? 0);
