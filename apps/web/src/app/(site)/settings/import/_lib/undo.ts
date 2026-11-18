import { sleep } from '@tvseri.es/utils';

import { showToast } from '@/components/ui/toast/showToast';

import { undoImport } from './actions';
import { readLastImport } from './lastImportStatus';

const UNDO_POLL_MS = 2000;
/** About three minutes: the API says seconds to a minute */
const UNDO_POLL_ATTEMPTS = 90;

/** Asks the API to undo an import; a toast says so when it can't. */
export async function requestUndo(importId: string): Promise<boolean> {
  const result = await undoImport(importId).catch(() => null);
  if (!result?.ok) {
    showToast({ title: 'Couldn’t undo the import. Try again.', tone: 'error' });
    return false;
  }
  return true;
}

/**
 * Polls the last import until it is undone (or is no longer the last one),
 * then calls `onUndone`. Past about three minutes a toast says it
 * finishes on its own.
 */
export async function pollUntilUndone(
  importId: string,
  onUndone: () => void,
): Promise<void> {
  for (let attempt = 0; attempt < UNDO_POLL_ATTEMPTS; attempt++) {
    await sleep(UNDO_POLL_MS);
    const last = await readLastImport();
    if (
      last === null ||
      (last && (last.importId !== importId || last.undoneAt))
    ) {
      onUndone();
      return;
    }
  }
  showToast({
    title: 'Undo is taking longer than usual. It finishes on its own.',
  });
}
