import type { NavigationType, WebVitalRecord } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import { metricsDynamo } from '@/routes/metrics/reads';

import { db, sqsMessages } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const record = (navigationType: NavigationType): WebVitalRecord => ({
  client: { platform: 'web', userAgent: 'Test Browser', version: null },
  country: 'NL',
  delta: 1200,
  device: { type: 'desktop' },
  id: 'v6-1-1',
  name: 'LCP',
  navigationType,
  path: '/example-series',
  rating: 'good',
  route: '/[id]/[[...slug]]',
  timestamp: '2026-11-01T12:00:00.000Z',
  type: 'web-vital',
  value: 1200,
});

/**
 * The web-vitals records queued: the API's own request metrics (a 10%
 * sample, `middleware/metrics.ts`) go to the same queue and are left out
 */
const webVitals = () =>
  sqsMessages.filter(
    (message) => (message.body as { type?: string }).type === 'web-vital',
  );

describe('POST /metrics/web-vitals', () => {
  it('queues every navigation type web-vitals reports', async () => {
    // web-vitals 6 adds 'soft-navigation' (only with `reportSoftNavs`, which
    // the web leaves off; the API still takes what the library's type allows)
    const batch = (
      [
        'navigate',
        'reload',
        'back-forward',
        'back-forward-cache',
        'prerender',
        'restore',
        'soft-navigation',
      ] as const
    ).map(record);

    const res = await request('/metrics/web-vitals', {
      body: batch,
      method: 'POST',
    });

    expect(res.status).toBe(204);
    expect(webVitals().map((message) => message.body)).toEqual(batch);
    expect(
      webVitals().every(
        (message) => message.queueUrl === 'https://sqs.test/metrics',
      ),
    ).toBe(true);
  });

  it('refuses a navigation type it does not know', async () => {
    const res = await request('/metrics/web-vitals', {
      body: [{ ...record('navigate'), navigationType: 'teleport' }],
      method: 'POST',
    });

    expect(res.status).toBe(400);
    expect(webVitals()).toHaveLength(0);
  });
});

describe('the dashboard reads of /metrics/web-vitals', () => {
  it.each(['summary', 'routes', 'countries'])(
    '/%s is admin only, kept by the browser alone',
    async (view) => {
      seedUser({ role: 'admin' });
      vi.spyOn(metricsDynamo, 'send').mockImplementation(((command: never) =>
        db.send(command)) as never);
      const path = `/metrics/web-vitals/${view}?days=7`;

      expect((await request(path)).status).toBe(401);
      const admin = await request(path, { admin: true, as: USER_ID });
      expect(admin.status).toBe(200);
      expect(admin.headers.get('cache-control')).toMatch(/^private, /);
    },
  );
});
