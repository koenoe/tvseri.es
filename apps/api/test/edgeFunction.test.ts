import { describe, expect, it } from 'vitest';

import { API_WRITE_ROUTES } from '../../../infra/apiWriteRoutes';
import { buildRouterFunction } from './edgeFunction';

// CloudFront Functions may be 10 KB (10,240 bytes). The build stays under
// 9,000 with a 64-character key, so a longer key or the next edit fails here
// rather than in a production deploy.
const BUDGET = 9_000;
const KEY = 'k'.repeat(64);

const API_HOST = 'api-fn.lambda-url.eu-west-2.on.aws';
const WRITE_HOST = 'write-fn.lambda-url.eu-west-2.on.aws';

// SST's routing data in the store: the catalogue function as the default route
const KV: Readonly<Record<string, string>> = {
  'abcd:routes': JSON.stringify(['url,api1,,']),
  'api1:metadata': JSON.stringify({ host: API_HOST, origin: {} }),
  [API_WRITE_ROUTES.kvKey]: WRITE_HOST,
};

type Request = Readonly<{
  method: string;
  path: string;
  headers?: Readonly<Record<string, string>>;
}>;

/** Runs the minified function as CloudFront would, with a fake `cloudfront` */
const runBuilt = async (
  code: string,
  { headers = {}, method, path }: Request,
) => {
  const imported = /^import ([\w$]+) from"cloudfront";/.exec(code);
  if (!imported?.[1]) {
    throw new Error('No cloudfront import');
  }
  let origin: Readonly<Record<string, unknown>> | undefined;
  const cf = {
    kvs: () => ({
      get: async (key: string) => {
        const value = KV[key];
        if (value === undefined) throw new Error('not found');
        return value;
      },
    }),
    updateRequestOrigin: (next: Record<string, unknown>) => {
      origin = next;
    },
  };
  const event = {
    request: {
      cookies: {},
      headers: Object.fromEntries(
        Object.entries({ host: 'api.tvseri.es', ...headers }).map(
          ([key, value]) => [key, { value }],
        ),
      ),
      method,
      querystring: {},
      uri: path,
    },
  };
  const run = new Function(
    imported[1],
    'event',
    `${code.slice(imported[0].length)}\nreturn handler(event);`,
  ) as (cfModule: unknown, event: unknown) => Promise<{ statusCode?: number }>;
  const response = await run(cf, event);
  return { domain: origin?.domainName, statusCode: response.statusCode };
};

describe('the API edge function as deployed', async () => {
  const code = await buildRouterFunction(KEY);

  it(`stays under ${BUDGET} bytes with a 64-character key`, () => {
    expect(new TextEncoder().encode(code).length).toBeLessThanOrEqual(BUDGET);
  });

  it('keeps the name CloudFront calls', () => {
    expect(code).toMatch(
      /^import [\w$]+ from"cloudfront";async function handler\(/,
    );
  });

  const withKey = { 'x-api-key': KEY };

  it('still refuses a request without the API key', async () => {
    const result = await runBuilt(code, { method: 'GET', path: '/series/1' });
    expect(result.statusCode).toBe(401);
  });

  it('sends a catalogue read to ApiFunction through SST’s routing', async () => {
    const result = await runBuilt(code, {
      headers: withKey,
      method: 'GET',
      path: '/series/1',
    });
    expect(result.domain).toBe(API_HOST);
  });

  it('sends marks and own-state reads to the write function', async () => {
    for (const [method, path] of [
      ['POST', '/user/u_1/watched/batch'],
      ['GET', '/me/library-ids'],
    ] as const) {
      const result = await runBuilt(code, { headers: withKey, method, path });
      expect(result.domain, `${method} ${path}`).toBe(WRITE_HOST);
    }
  });

  it('still blocks the CloudFront default domain', async () => {
    const result = await runBuilt(code, {
      headers: { ...withKey, host: 'd111.cloudfront.net' },
      method: 'POST',
      path: '/user/u_1/watched/batch',
    });
    expect(result.statusCode).toBe(403);
  });
});
