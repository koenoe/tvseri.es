import {
  type ConnectionService,
  ConnectionStatusSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

/** A JSON answer checked against `schema`; null for anything else. */
export async function readAs<S extends v.GenericSchema>(
  request: Promise<Response>,
  schema: S,
): Promise<v.InferOutput<S> | null> {
  const response = await request.catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const parsed = v.safeParse(schema, await response.json().catch(() => null));
  return parsed.success ? parsed.output : null;
}

/**
 * A service card's status from the site's small JSON route: the pairing's
 * poll and the running sync's poll both read it, never the whole page.
 */
export const readStatus = (service: ConnectionService) =>
  readAs(fetch(`/api/connections/${service}`), ConnectionStatusSchema);
