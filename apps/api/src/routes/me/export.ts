import { todayUtc } from '@tvseri.es/utils';
import { Hono } from 'hono';
import { exportEverything, exportHistoryCsv } from '@/lib/export';
import type { Variables } from '@/middleware/auth';
import { fitsLambdaResponse } from '@/utils/lambdaResponse';

const app = new Hono<{ Variables: Variables }>();

const attachment = (
  c: { header: (name: string, value: string) => void },
  type: string,
  filename: string,
) => {
  c.header('Content-Type', type);
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
};

// The watch history, in the columns the importer reads back
app.get('/history.csv', async (c) => {
  const { user } = c.get('auth')!;
  const csv = await exportHistoryCsv(user.id);

  if (!fitsLambdaResponse(csv)) {
    return c.json({ error: 'Export too large' }, 413);
  }

  attachment(
    c,
    'text/csv; charset=utf-8',
    `tvseries-history-${todayUtc()}.csv`,
  );
  return c.body(csv);
});

// Everything, as JSON
app.get('/everything.json', async (c) => {
  const { user } = c.get('auth')!;
  const json = JSON.stringify(await exportEverything(user));

  if (!fitsLambdaResponse(json)) {
    return c.json({ error: 'Export too large' }, 413);
  }

  attachment(c, 'application/json', `tvseries-everything-${todayUtc()}.json`);
  return c.body(json);
});

export default app;
