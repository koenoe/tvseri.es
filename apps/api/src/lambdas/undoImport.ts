import { Resource } from 'sst';

import { type UndoImportMessage, undoImport } from '@/lib/imports/undo';
import { resumableStepHandler } from '@/lib/sqs';

/**
 * Undo import. One message per undo (batch size 1). A big import that
 * doesn't fit one run continues in a new message; a failure is reported per
 * message (partial batch response), retried, then dead-lettered (alarmed).
 */
export const handler = resumableStepHandler({
  label: 'UNDO IMPORT',
  queueUrl: () => Resource.UndoImportQueue.url,
  run: undoImport,
  summary: (message: UndoImportMessage, outcome) =>
    `${outcome} | User: ${message.userId} | Import: ${message.importId}`,
});
