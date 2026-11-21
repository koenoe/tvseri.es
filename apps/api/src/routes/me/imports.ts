import { vValidator } from '@hono/valibot-validator';
import { ImportBatchSchema, ImportIdSchema } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import * as v from 'valibot';

import {
  assertImportOpen,
  checkImportBatch,
  requestUndoImport,
  startImport,
  writeImportBatch,
} from '@/lib/imports';
import type { SignedInVariables } from '@/middleware/auth';

const ImportIdParamSchema = v.object({
  importId: ImportIdSchema,
});

/** `/me/imports`: the signed-in user's import, its check step and Undo */
// Mounted under /me, behind its requireAuth()
const app = new Hono<{ Variables: SignedInVariables }>();

app.post('/', async (c) => {
  const { user } = c.get('auth');
  return c.json(await startImport(user.id), 201);
});

// The check step: what would be written, nothing is
app.post('/check', vValidator('json', ImportBatchSchema), async (c) => {
  const { user } = c.get('auth');
  return c.json(await checkImportBatch(user.id, c.req.valid('json')));
});

app.post(
  '/:importId/batch',
  vValidator('param', ImportIdParamSchema),
  vValidator('json', ImportBatchSchema),
  async (c) => {
    const { user } = c.get('auth');
    const { importId } = c.req.valid('param');
    assertImportOpen(user.lastImport, importId);
    return c.json(
      await writeImportBatch(user.id, importId, c.req.valid('json')),
      201,
    );
  },
);

// Undo: queued, the episodes go within a minute or so
app.delete(
  '/:importId',
  vValidator('param', ImportIdParamSchema),
  async (c) => {
    const { user } = c.get('auth');
    const { importId } = c.req.valid('param');
    await requestUndoImport(user.id, importId);
    return c.json({ status: 'queued' }, 202);
  },
);

export default app;
