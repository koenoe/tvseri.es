import { buildApiEdgeInjection } from '../../../infra/apiEdgeInjection';
import { API_KEY } from './request';

/**
 * Runs the API Router's viewer-request injection (infra/apiEdgeInjection.ts)
 * the way CloudFront does: inside SST's `async function handler(event)`,
 * with `cf` from the `cloudfront` module. Falling off the end means SST's
 * own routing runs next, which sends every API path to the default route,
 * the catalogue function (ApiFunction).
 */

type EdgeHeaders = Record<string, { value: string }>;

type EdgeRequest = {
  method: string;
  uri: string;
  headers: EdgeHeaders;
  querystring: Record<string, { value: string }>;
};

export type EdgeCall = Readonly<{
  method: string;
  path: string;
  headers?: Readonly<Record<string, string>>;
  query?: Readonly<Record<string, string>>;
  /** The Router's KeyValueStore; missing keys throw, as `cf.kvs().get` does */
  kv?: Readonly<Record<string, string>>;
}>;

export type EdgeResult = Readonly<{
  /** `unauthorized`: the 401; `default`: on to SST's routing; `origin`: routed here */
  outcome: 'default' | 'origin' | 'unauthorized';
  /** The origin the injection set with `cf.updateRequestOrigin` */
  origin?: Readonly<Record<string, unknown>>;
  request: Readonly<EdgeRequest>;
}>;

const FELL_THROUGH = Symbol('fell through');

const toEdgeValues = (values: Readonly<Record<string, string>>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { value }]),
  );

export const runEdge = async ({
  headers = {},
  kv = {},
  method,
  path,
  query = {},
}: EdgeCall): Promise<EdgeResult> => {
  const code = buildApiEdgeInjection(API_KEY);
  const run = new Function(
    'event',
    'cf',
    'FELL_THROUGH',
    `return (async () => { ${code}\n return FELL_THROUGH; })();`,
  ) as (
    event: { request: EdgeRequest },
    cf: unknown,
    fellThrough: symbol,
  ) => Promise<unknown>;

  let origin: Record<string, unknown> | undefined;
  const cf = {
    kvs: () => ({
      get: async (key: string) => {
        const value = kv[key];
        if (value === undefined) {
          throw new Error('not found');
        }
        return value;
      },
    }),
    updateRequestOrigin: (next: Record<string, unknown>) => {
      origin = next;
    },
  };
  const request: EdgeRequest = {
    headers: toEdgeValues(headers),
    method,
    querystring: toEdgeValues(query),
    uri: path,
  };

  const result = await run({ request }, cf, FELL_THROUGH);
  if (result === FELL_THROUGH) {
    return { origin, outcome: 'default', request };
  }
  if (result === request) {
    return { origin, outcome: 'origin', request };
  }
  return { outcome: 'unauthorized', request };
};
