/**
 * A stub of the tvseri.es API for local runs and e2e: `next dev`/`next start`
 * with `API_URL=http://localhost:<port>` and `API_KEY=stub` render real pages
 * without secrets or `sst dev`. Run with `node e2e/stub-api/server.ts`
 * (Node strips the types). Every file in `fixtures/` exports `routes`.
 *
 * Env: `STUB_API_PORT` (default 3190), `STUB_API_DELAY_MS` (adds latency to
 * every response, for pending states), `STUB_API_LOG=1` (prints one line
 * per request, so a measurement can count the API reads a page view causes).
 */
import { readdir } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { StubRoute } from './types';

// Isolated state: a signed-in test carries a namespace in its token (`ns`
// claim, see `helpers/session.ts`). The server loads its own copy of every
// fixture module for that namespace, so each test owns every piece of mutable
// state (marks, lists, settings, follows, picks) without any fixture knowing
// about it: the resolve hook below tags each import made from inside a
// namespaced module with `?stubns=<ns>`, giving it its own module instance.
const NS_PARAM = 'stubns';
const INTERCEPT = '*';
const e2eDir = path.dirname(import.meta.dirname);

// Fixtures may share helpers (`fixtures/<area>/*.ts`) imported without an
// extension, like the rest of the app; Node's ESM loader needs one.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = (() => {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
          return nextResolve(`${specifier}.ts`, context);
        }
        throw error;
      }
    })();
    const namespace = context.parentURL
      ? new URL(context.parentURL).searchParams.get(NS_PARAM)
      : null;
    if (
      namespace &&
      resolved.url.startsWith('file:') &&
      !resolved.url.includes('/node_modules/') &&
      resolved.url.startsWith(pathToFileURL(`${e2eDir}${path.sep}`).href)
    ) {
      return {
        ...resolved,
        url: `${resolved.url}?${NS_PARAM}=${encodeURIComponent(namespace)}`,
      };
    }
    return resolved;
  },
});

const port = Number(process.env.STUB_API_PORT ?? 3190);
const delay = Number(process.env.STUB_API_DELAY_MS ?? 0);
const logRequests = process.env.STUB_API_LOG === '1';
const fixturesDir = path.join(import.meta.dirname, 'fixtures');

async function loadRoutes(namespace?: string): Promise<StubRoute[]> {
  const files = (await readdir(fixturesDir))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort();
  const modules = await Promise.all(
    files.map(
      (file) =>
        import(
          `${pathToFileURL(path.join(fixturesDir, file)).href}${namespace ? `?${NS_PARAM}=${encodeURIComponent(namespace)}` : ''}`
        ) as Promise<{
          intercept?: StubRoute['handle'];
          routes?: readonly StubRoute[];
        }>,
    ),
  );
  // Every module's `intercept` sees every request of its namespace before
  // any route (an outage a spec switched on, `fixtures/__outage.ts`), in
  // file order; then the routes, in file order
  return [
    ...modules.flatMap((module) =>
      module.intercept
        ? [{ handle: module.intercept, path: INTERCEPT } as const]
        : [],
    ),
    ...modules.flatMap((module) => module.routes ?? []),
  ];
}

function match(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const expected = pattern.split('/');
  const actual = pathname.split('/');
  if (expected.length !== actual.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (const [index, segment] of expected.entries()) {
    const value = actual[index] ?? '';
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(value);
    } else if (segment !== value) {
      return null;
    }
  }
  return params;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const routes = await loadRoutes();
const namespaces = new Map<string, Promise<StubRoute[]>>();

/** The namespace a token carries (`ns` claim), if any. */
function namespaceOf(authorization: string | undefined): string | undefined {
  const payload = authorization?.split(' ')[1]?.split('.')[1];
  if (!payload) {
    return undefined;
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const claim =
      typeof decoded === 'object' && decoded !== null && 'ns' in decoded
        ? decoded.ns
        : undefined;
    return typeof claim === 'string' && /^[\w-]{1,80}$/.test(claim)
      ? claim
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The routes a request is answered from. A namespace is copied on its first
 * write: until then it reads the shared copy, which no signed-in request can
 * change (a write without a namespace is refused) and so is still the seeds.
 * A copy costs the whole fixture graph (~100ms of this one thread and a few
 * MB that are never freed, an ESM module can't be unloaded), and most tests
 * only read: copying every signed-in test's namespace made the stub slower
 * and bigger over a run until reads timed out.
 */
function routesFor(
  namespace: string | undefined,
  method: string,
): Promise<StubRoute[]> | StubRoute[] {
  if (!namespace) {
    return routes;
  }
  let loaded = namespaces.get(namespace);
  if (!loaded && (method === 'GET' || method === 'HEAD')) {
    return routes;
  }
  if (!loaded) {
    loaded = loadRoutes(namespace);
    namespaces.set(namespace, loaded);
  }
  return loaded;
}

/**
 * `/user/@username/...` (the web's Library reads beside the profile read,
 * as the API allows): the profile people's and the outage profiles' ids.
 */
async function idOfUsername(username: string): Promise<string | null> {
  const [{ personByUsername }, { outageId }] = await Promise.all([
    import('./fixtures/user-profile/people.ts'),
    import('./fixtures/user-profile/outage.ts'),
  ]);
  if (username.startsWith('out-')) {
    return outageId(username);
  }
  return personByUsername(username)?.user.id ?? null;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const method = request.method ?? 'GET';
  const atUser = /^\/user\/(?:@|%40)([^/]+)(\/.*)?$/.exec(url.pathname);
  if (atUser?.[1]) {
    const id = await idOfUsername(decodeURIComponent(atUser[1]));
    if (!id) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Not found (stub API)' }));
      return;
    }
    url.pathname = `/user/${id}${atUser[2] ?? ''}`;
  }
  if (logRequests && !url.pathname.startsWith('/img/')) {
    console.log(
      `[stub-api] ${Date.now()} ${method} ${url.pathname}${url.search}`,
    );
  }

  // The real API requires the key; the stub's own placeholder images don't
  // (the browser loads them).
  if (
    request.headers['x-api-key'] !== 'stub' &&
    !url.pathname.startsWith('/img/')
  ) {
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Forbidden' }));
    return;
  }

  // Read once: a route that gives no answer passes the same body on
  const body = await readBody(request);
  // The admin's picks are the one piece of state that is shared on purpose
  // ("saves it for everyone": the public shell reads them without a token),
  // so `/admin/*` always answers from the shared copy; its spec runs alone.
  const namespace = url.pathname.startsWith('/admin/')
    ? undefined
    : namespaceOf(request.headers.authorization);
  // Shared state is read-only: a signed-in write without an isolated session
  // would leak into every other spec, so it fails loudly instead.
  if (
    !namespace &&
    request.headers.authorization &&
    method !== 'GET' &&
    method !== 'HEAD' &&
    !url.pathname.startsWith('/__stub/') &&
    !url.pathname.startsWith('/admin/')
  ) {
    response.writeHead(409, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        message:
          'Stub API: a write needs an isolated session (sign in with signInAs inside a test; see e2e/README.md)',
      }),
    );
    return;
  }
  for (const route of await routesFor(namespace, method)) {
    const intercepting = route.path === INTERCEPT;
    if (!intercepting && (route.method ?? 'GET') !== method) {
      continue;
    }
    const params = intercepting ? {} : match(route.path, url.pathname);
    if (!params) {
      continue;
    }
    const result = await route.handle({
      body,
      headers: { authorization: request.headers.authorization },
      method,
      params,
      path: url.pathname,
      query: url.searchParams,
    });
    // No answer: the next matching route (e.g. a narrower fixture) decides.
    if (!result) {
      continue;
    }
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const status = result.status ?? 200;
    const headers = {
      'cache-control': 'no-store',
      'content-type': 'application/json',
      ...result.headers,
    };
    response.writeHead(status, headers);
    // Bytes (board images for local screenshots) are sent as they are
    if (result.body instanceof Uint8Array) {
      response.end(result.body);
      return;
    }
    // A non-JSON content type (placeholder images) is sent as it is.
    const raw =
      typeof result.body === 'string' &&
      !headers['content-type'].includes('json');
    response.end(
      result.body === undefined
        ? ''
        : raw
          ? (result.body as string)
          : JSON.stringify(result.body),
    );
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found (stub API)' }));
}).listen(port, '127.0.0.1', () => {
  console.log(`stub API on http://localhost:${port} (${routes.length} routes)`);
});
