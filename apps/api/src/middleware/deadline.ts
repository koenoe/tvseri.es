import type { MiddlewareHandler } from 'hono';

import { READ_RETRY_DEADLINE, READ_START_DEADLINE } from '@/constants';
import { runWithDeadline } from '@/lib/deadline';

/**
 * Starts the deadlines for reads (GET/HEAD): see READ_RETRY_DEADLINE and
 * READ_START_DEADLINE. Everything the handler awaits runs inside them.
 */
export const retryDeadline =
  (ms: number = READ_RETRY_DEADLINE): MiddlewareHandler =>
  async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      await next();
      return;
    }
    await runWithDeadline(ms, next, READ_START_DEADLINE);
  };
