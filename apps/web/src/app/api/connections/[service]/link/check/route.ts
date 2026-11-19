import {
  ConnectionLinkCheckReplySchema,
  ConnectionLinkCheckRequestSchema,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { codeRefusal, linkForward, refuse } from '../linkForward';

/**
 * The consent screen's check: which account a code links to, shown before
 * Continue. The API never spends the code here but counts a wrong one
 * against the link's hourly limit.
 */
export const POST = linkForward(
  ConnectionLinkCheckRequestSchema,
  async ({ address, body, service }) => {
    try {
      const reply = await apiFetch('/connections/:service/link/check', {
        body: { address, code: body.code },
        method: 'POST',
        params: { service },
        schema: ConnectionLinkCheckReplySchema,
      });
      return Response.json(reply);
    } catch (error) {
      const { reason, status } = codeRefusal(error);
      return refuse(reason, status);
    }
  },
);
