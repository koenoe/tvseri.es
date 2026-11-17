import { describe, expect, it } from 'vitest';

import { GET } from './route';

const get = (code: string) =>
  GET(new Request(`https://www.tvseri.es/api/flags/${code}`), {
    params: Promise.resolve({ code }),
  });

describe('GET /api/flags/:code', () => {
  it('serves a country’s flag as an immutable SVG', async () => {
    const res = await get('GB');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(await res.text()).toContain('<svg');
  });

  // Only two capital letters reach the flag set: no prototype keys, no paths
  it.each(['gb', 'XX', 'GBR', '__proto__', 'constructor', '../GB'])(
    '404s %s',
    async (code) => {
      expect((await get(code)).status).toBe(404);
    },
  );
});
