import {
  type ConnectionLinkReply,
  type ConnectionService,
  ConnectionServiceSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { ApiError } from '@/lib/api/client';

import { createRateLimiter } from './rateLimit';

/**
 * Shared by the extension's two public routes, link and its check: no
 * session and no API key, so the code the site minted is the proof.
 */

type Refusal = Extract<ConnectionLinkReply, Readonly<{ ok: false }>>['reason'];

export const refuse = (reason: Refusal, status: number): Response =>
  Response.json({ ok: false, reason } satisfies ConnectionLinkReply, {
    status,
  });

/**
 * In memory, so it only blunts brute force: a burst can land on a fresh
 * instance. The API holds the real hourly limit. One per route, so checks
 * never use up the Continue that follows them.
 */
const createCodeLimiter = () =>
  createRateLimiter({ max: 10, maxKeys: 5000, windowMs: 60_000 });

/**
 * The first `x-forwarded-for` hop. The API only sees our address, so this
 * goes along in the body; none without the header, so no bucket is shared
 * by everyone.
 */
const clientAddress = (req: Request): string | undefined =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;

type CodeRefusal = Readonly<{
  reason: 'bad-code' | 'rate-limited' | 'unavailable';
  status: number;
}>;

/** An outage is `unavailable`, never a bad code, so the extension doesn't blame the user */
export function codeRefusal(error: unknown): CodeRefusal {
  if (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 404)
  ) {
    return { reason: 'bad-code', status: error.status };
  }
  if (error instanceof ApiError && error.status === 429) {
    return { reason: 'rate-limited', status: 429 };
  }
  return { reason: 'unavailable', status: 502 };
}

type Context = Readonly<{ params: Promise<{ service: string }> }>;

type Forward<T> = (
  request: Readonly<{
    address: string | undefined;
    /** The schema's output: only its fields, after its transforms */
    body: T;
    service: ConnectionService;
  }>,
) => Promise<Response>;

/**
 * A POST that checks the service, parses the body and counts the address
 * before `forward` reaches the API.
 */
export function linkForward<S extends v.GenericSchema>(
  schema: S,
  forward: Forward<v.InferOutput<S>>,
) {
  const limiter = createCodeLimiter();
  return async (req: Request, { params }: Context): Promise<Response> => {
    const { service } = await params;
    if (!v.is(ConnectionServiceSchema, service)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const body = v.safeParse(schema, await req.json().catch(() => null));
    if (!body.success) {
      return refuse('bad-code', 400);
    }
    // Per address, not per code, so one place can't spray the code space
    const address = clientAddress(req);
    if (!limiter.allow(address ?? 'local')) {
      return refuse('rate-limited', 429);
    }
    return forward({ address, body: body.output, service });
  };
}
