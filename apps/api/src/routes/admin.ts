import { vValidator } from '@hono/valibot-validator';
import {
  type AdminWriteResult,
  PreferredImagesSchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { invalidatePaths } from '@/lib/cdn';
import {
  deletePreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import { requireAuthAdmin } from '@/middleware/auth';
import { IdParamSchema } from '@/utils/params';

const app = new Hono();

app.use(requireAuthAdmin());

/**
 * Writes the preferred images and starts a purge of the paths that show them
 * (the series pages and the trending collection, with any query such as the
 * web's `?colour=` version), answering without waiting for the purge. A purge
 * CloudFront refuses is logged by `invalidatePaths` and doesn't fail the
 * write.
 */
async function writeAndPurge(
  id: number,
  write: Promise<unknown>,
): Promise<AdminWriteResult> {
  await Promise.all([
    write,
    invalidatePaths([`/series/${id}*`, '/collection/trending*']),
  ]);
  return { message: 'OK' };
}

app.put(
  '/preferred-images/series/:id{[0-9]+}',
  vValidator('param', IdParamSchema),
  vValidator('json', PreferredImagesSchema),
  async (c) => {
    const id = c.req.valid('param').id;
    return c.json(
      await writeAndPurge(id, putPreferredImages(id, c.req.valid('json'))),
    );
  },
);

app.delete(
  '/preferred-images/series/:id{[0-9]+}',
  vValidator('param', IdParamSchema),
  async (c) => {
    const id = c.req.valid('param').id;
    return c.json(await writeAndPurge(id, deletePreferredImages(id)));
  },
);

export default app;
