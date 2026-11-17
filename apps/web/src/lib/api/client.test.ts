import * as v from 'valibot';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, createApiClient, isUpstreamFailure } from './client';

const CONFIG = { apiKey: 'test-key', baseUrl: 'https://api.test' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

/** One "request scope": identical calls share a result, like React's `cache`. */
function requestScopeDedupe<A extends unknown[], R>(fn: (...args: A) => R) {
  const results = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (!results.has(key)) {
      results.set(key, fn(...args));
    }
    return results.get(key) as R;
  };
}

function setup(...responses: Array<Response | Error>) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) {
    if (response instanceof Error) {
      fetch.mockRejectedValueOnce(response);
    } else {
      fetch.mockResolvedValueOnce(response);
    }
  }
  const { apiFetch } = createApiClient({
    config: () => CONFIG,
    dedupe: requestScopeDedupe,
    fetch,
  });
  const lastRequest = () => {
    const [url, init] = fetch.mock.lastCall ?? [];
    return { headers: new Headers(init?.headers), init, url: String(url) };
  };
  return { apiFetch, fetch, lastRequest };
}

const expectApiError = async (
  promise: Promise<unknown>,
  status: number,
  code?: string,
) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ code, status });
};

describe('apiFetch', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('returns the parsed JSON body', async () => {
    const { apiFetch } = setup(json(200, { id: 1, title: 'Severance' }));

    expect(await apiFetch('/series/1')).toEqual({ id: 1, title: 'Severance' });
  });

  it('sends the API key, the platform and the access token', async () => {
    const { apiFetch, lastRequest } = setup(json(200, {}));

    await apiFetch('/me', { accessToken: 'token-1' });

    const { headers, init, url } = lastRequest();
    expect(url).toBe('https://api.test/me');
    expect(init?.method).toBe('GET');
    expect(headers.get('x-api-key')).toBe('test-key');
    expect(headers.get('x-client-platform')).toBe('web');
    expect(headers.get('authorization')).toBe('Bearer token-1');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends a JSON body', async () => {
    const { apiFetch, lastRequest } = setup(json(200, {}));

    await apiFetch('/me', { body: { name: 'Margaux' }, method: 'PUT' });

    const { headers, init } = lastRequest();
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe('{"name":"Margaux"}');
    expect(headers.get('content-type')).toBe('application/json');
  });

  describe('paths', () => {
    it('encodes path params and sorts the query', async () => {
      const { apiFetch, lastRequest } = setup(json(200, {}));

      await apiFetch('/user/:id/watched/:seriesId', {
        params: { id: 'a b/c?d', seriesId: 1396 },
        query: { include_images: true, page: undefined, region: 'NL' },
      });

      expect(lastRequest().url).toBe(
        'https://api.test/user/a%20b%2Fc%3Fd/watched/1396?include_images=true&region=NL',
      );
    });

    it.each([
      ['/series/:id', '/series/7?colour=2'],
      ['/series/:id/credits', '/series/7/credits'],
    ])(
      'asks %s with the page colour version only when it carries a colour',
      async (path, expected) => {
        const { apiFetch, lastRequest } = setup(json(200, {}));

        await apiFetch(path, { params: { id: 7 } });

        expect(lastRequest().url).toBe(`https://api.test${expected}`);
      },
    );

    it.each(['..', '.', ''])(
      'rejects the path param %j without calling the API',
      async (username) => {
        const { apiFetch, fetch } = setup();

        await expectApiError(
          apiFetch('/user/by-username/:username', { params: { username } }),
          400,
          'ApiInvalidPathParam',
        );
        expect(fetch).not.toHaveBeenCalled();
      },
    );

    it('throws on a missing path param', async () => {
      const { apiFetch } = setup();

      await expect(
        apiFetch('/series/:id/season/:season', { params: { id: 1 } }),
      ).rejects.toThrow(':season');
    });
  });

  describe('empty and missing', () => {
    it('returns null for an empty body', async () => {
      const { apiFetch } = setup(new Response('', { status: 200 }));

      expect(
        await apiFetch('/series/1/watched', { method: 'POST' }),
      ).toBeNull();
    });

    it("returns null on 404 with notFound: 'null'", async () => {
      const { apiFetch } = setup(
        json(404, { message: 'Not Found', status: 404 }),
      );

      expect(await apiFetch('/series/1', { notFound: 'null' })).toBeNull();
    });

    it('throws ApiError(404) on 404 by default', async () => {
      const { apiFetch } = setup(
        json(404, { message: 'Not Found', status: 404 }),
      );

      await expectApiError(apiFetch('/series/1'), 404, 'Not Found');
    });
  });

  describe('errors', () => {
    it("passes the API's error code through", async () => {
      const { apiFetch } = setup(
        json(409, { message: 'UsernameAlreadyTaken', status: 409 }),
      );

      await expectApiError(
        apiFetch('/me', { body: {}, method: 'PUT' }),
        409,
        'UsernameAlreadyTaken',
      );
    });

    it('has no code for a non-JSON error body', async () => {
      const { apiFetch } = setup(new Response('<html>', { status: 403 }));

      await expectApiError(apiFetch('/series/1'), 403, undefined);
    });

    it('maps a network failure to ApiError(0)', async () => {
      const { apiFetch } = setup(new TypeError('fetch failed'));

      await expectApiError(apiFetch('/series/1'), 0, 'ApiNetworkError');
    });

    it('maps a timeout to ApiError(0)', async () => {
      const { apiFetch } = setup(
        new DOMException('The operation timed out.', 'TimeoutError'),
      );

      await expectApiError(apiFetch('/series/1'), 0, 'ApiTimeout');
    });

    it('never retries', async () => {
      const { apiFetch, fetch } = setup(json(503, { message: 'Down' }));

      await expectApiError(apiFetch('/series/1'), 503, 'Down');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('throws ApiError(0) when the API is not configured', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const { apiFetch } = createApiClient({
        config: () => null,
        dedupe: requestScopeDedupe,
        fetch,
      });

      await expectApiError(apiFetch('/series/1'), 0, 'ApiNotConfigured');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('dedupe', () => {
    it('sends identical GETs once per request scope, whatever the query order', async () => {
      const { apiFetch, fetch } = setup(json(200, { id: 1 }));

      const [a, b] = await Promise.all([
        apiFetch('/series/:id', { params: { id: 1 }, query: { a: 1, b: 2 } }),
        apiFetch('/series/:id', { params: { id: '1' }, query: { a: 1, b: 2 } }),
      ]);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(a).toEqual({ id: 1 });
      expect(b).toEqual({ id: 1 });
    });

    it('keeps GETs for different viewers apart', async () => {
      const { apiFetch, fetch } = setup(json(200, {}), json(200, {}));

      await apiFetch('/me', { accessToken: 'a' });
      await apiFetch('/me', { accessToken: 'b' });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('never dedupes writes', async () => {
      const { apiFetch, fetch } = setup(json(200, {}), json(200, {}));

      await apiFetch('/follow/:id', { method: 'POST', params: { id: 'x' } });
      await apiFetch('/follow/:id', { method: 'POST', params: { id: 'x' } });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('schema', () => {
    const Series = v.object({ id: v.number(), title: v.string() });

    it('returns the validated output', async () => {
      const { apiFetch } = setup(
        json(200, { extra: true, id: 1, title: 'Dark' }),
      );

      const series = await apiFetch('/series/1', { schema: Series });

      expect(series).toEqual({ id: 1, title: 'Dark' });
    });

    it('throws a typed error when the response does not match', async () => {
      const { apiFetch } = setup(json(200, { id: '1' }));

      await expectApiError(
        apiFetch('/series/1', { schema: Series }),
        200,
        'ApiInvalidResponse',
      );
    });

    it('skips validation for a 404 that returns null', async () => {
      const { apiFetch } = setup(json(404, { message: 'Not Found' }));

      expect(
        await apiFetch('/series/1', { notFound: 'null', schema: Series }),
      ).toBeNull();
    });
  });
});

describe('isUpstreamFailure', () => {
  it.each([
    [0, true],
    [429, true],
    [500, true],
    [400, false],
  ])('treats status %i as an outage: %s', (status, expected) => {
    expect(isUpstreamFailure(new ApiError(status))).toBe(expected);
  });

  it('is false for anything that is not an ApiError', () => {
    expect(isUpstreamFailure(new TypeError('bug'))).toBe(false);
  });
});
