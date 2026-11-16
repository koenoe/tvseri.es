import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

// 50 metrics (the API's batch cap) of well under 1 KB each fit easily
const MAX_BODY_BYTES = 64 * 1024;

const METRIC = { id: 'v1', name: 'LCP', value: 1200 };

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('https://www.tvseri.es/api/metrics/web-vitals', {
      body,
      headers: { 'x-vercel-ip-country': 'NL', ...headers },
      method: 'POST',
    }),
  );
}

/** A body without a Content-Length, as a chunked upload sends it. */
function chunked(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 1024) {
        controller.enqueue(bytes.slice(i, i + 1024));
      }
      controller.close();
    },
  });
}

describe('POST /api/metrics/web-vitals', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 202 })),
    );
  });

  it('forwards the batch to the API with the visitor’s country', async () => {
    const res = await post(JSON.stringify([METRIC, METRIC]));

    expect(res.status).toBe(204);
    const [url, init] = vi.mocked(fetch).mock.lastCall ?? [];
    expect(url).toBe('https://api.test/metrics/web-vitals');
    expect(new Headers(init?.headers).get('x-api-key')).toBe('key');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual([
      { ...METRIC, country: 'NL' },
      { ...METRIC, country: 'NL' },
    ]);
  });

  it('refuses a batch another site’s page sends, before reading it', async () => {
    const res = await post(JSON.stringify([METRIC]), {
      'sec-fetch-site': 'cross-site',
    });

    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('takes a batch its own pages send', async () => {
    const res = await post(JSON.stringify([METRIC]), {
      'sec-fetch-site': 'same-origin',
    });

    expect(res.status).toBe(204);
  });

  it('marks the country unknown without a geo header', async () => {
    await POST(
      new NextRequest('https://www.tvseri.es/api/metrics/web-vitals', {
        body: JSON.stringify(METRIC),
        method: 'POST',
      }),
    );

    const init = vi.mocked(fetch).mock.lastCall?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      ...METRIC,
      country: 'unknown',
    });
  });

  it('refuses a declared body over the cap without reading it', async () => {
    const res = await post('[]', {
      'content-length': String(MAX_BODY_BYTES + 1),
    });

    expect(res.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a streamed body over the cap', async () => {
    const res = await post(chunked(`["${'x'.repeat(MAX_BODY_BYTES)}"]`));

    expect(res.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a body right at the cap', async () => {
    const text = `["${'x'.repeat(MAX_BODY_BYTES - 4)}"]`;

    expect((await post(chunked(text))).status).toBe(204);
  });

  it.each(['not json', '42', 'null', '"text"'])(
    'answers 400 for the body %s',
    async (body) => {
      expect((await post(body)).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("passes the API's error status on", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: 'Invalid' }, { status: 400 }),
    );

    expect((await post(JSON.stringify([METRIC]))).status).toBe(400);
  });

  it('answers 500 when the API is unreachable or times out', async () => {
    vi.mocked(fetch).mockRejectedValue(
      new DOMException('The operation timed out.', 'TimeoutError'),
    );

    expect((await post(JSON.stringify([METRIC]))).status).toBe(500);
  });
});
