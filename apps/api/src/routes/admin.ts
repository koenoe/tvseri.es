import { vValidator } from '@hono/valibot-validator';
import { PreferredImagesSchema } from '@tvseri.es/types';
import { Hono } from 'hono';

import { invalidatePaths } from '@/lib/cdn';
import { putPreferredImages } from '@/lib/db/preferredImages';
import { requireAuthAdmin } from '@/middleware/auth';

const app = new Hono();

app.use(requireAuthAdmin());

app.put(
  '/preferred-images/series/:id',
  vValidator('json', PreferredImagesSchema),
  async (c) => {
    const body = c.req.valid('json');
    const id = c.req.param('id');

    await Promise.all([
      putPreferredImages(id, body),
      invalidatePaths([`/series/${id}`, '/collection/trending']),
    ]);

    return c.json({
      message: 'OK',
    });
  },
);

export default app;
