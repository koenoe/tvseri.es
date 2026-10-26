import { vValidator } from '@hono/valibot-validator';
import { PreferredImagesSchema } from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { invalidatePaths } from '@/lib/cdn';
import {
  deletePreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import { requireAuthAdmin } from '@/middleware/auth';

const app = new Hono();

app.use(requireAuthAdmin());

// Preferred images show on the series pages and in the trending collection.
const invalidatePreferredImagesPaths = (id: string) =>
  invalidatePaths([`/series/${id}*`, '/collection/trending']);

app.put(
  '/preferred-images/series/:id{[0-9]+}',
  vValidator('json', PreferredImagesSchema),
  async (c) => {
    const body = c.req.valid('json');
    const id = c.req.param('id');

    await Promise.all([
      putPreferredImages(id, body),
      invalidatePreferredImagesPaths(id),
    ]);

    return c.json({
      message: 'OK',
    });
  },
);

app.delete('/preferred-images/series/:id{[0-9]+}', async (c) => {
  const id = c.req.param('id');

  await Promise.all([
    deletePreferredImages(id),
    invalidatePreferredImagesPaths(id),
  ]);

  return c.json({
    message: 'OK',
  });
});

export default app;
