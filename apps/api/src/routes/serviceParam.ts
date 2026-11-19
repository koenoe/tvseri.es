import { vValidator } from '@hono/valibot-validator';
import {
  CONNECTION_SERVICES,
  ConnectionServiceSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

/**
 * The group keeps the alternation inside the parameter: without it, Hono read
 * `/me/connections/netflix/unresolved` as the status route.
 */
export const SERVICE_PARAM = `:service{(?:${CONNECTION_SERVICES.join('|')})}`;

export const serviceParam = vValidator(
  'param',
  v.object({ service: ConnectionServiceSchema }),
);
