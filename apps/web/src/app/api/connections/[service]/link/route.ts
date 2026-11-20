import {
  ConnectionLinkReplySchema,
  ConnectionLinkRequestSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { ApiError, apiFetch } from '@/lib/api/client';

import { codeRefusal, linkForward, refuse } from './linkForward';

/**
 * The API's test read has 11 seconds, its function 15: past the read's
 * budget its refusal still arrives, before the function's end
 */
const LINK_TIMEOUT_MS = 14_000;

/** A 422 carries its own reason; the rest read as any code's refusal */
function refusalOf(error: unknown): Response {
  if (error instanceof ApiError && error.status === 422) {
    const reply = v.safeParse(ConnectionLinkReplySchema, error.body);
    if (reply.success && !reply.output.ok) {
      return refuse(reply.output.reason, 422);
    }
    return refuse('unavailable', 502);
  }
  const { reason, status } = codeRefusal(error);
  return refuse(reason, status);
}

/** The link itself: the code, and the session the extension read */
export const POST = linkForward(
  ConnectionLinkRequestSchema,
  async ({ address, body, service }) => {
    try {
      const reply = await apiFetch('/connections/:service/link', {
        // The parsed fields only: unknown keys and unfit cookies stay behind
        body: {
          address,
          code: body.code,
          cookies: body.cookies,
          userAgent: body.userAgent,
        },
        method: 'POST',
        params: { service },
        schema: ConnectionLinkReplySchema,
        timeoutMs: LINK_TIMEOUT_MS,
      });
      return Response.json(reply);
    } catch (error) {
      return refusalOf(error);
    }
  },
);
