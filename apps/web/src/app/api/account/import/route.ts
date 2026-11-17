import { revalidateTag } from 'next/cache';
import { after, type NextRequest } from 'next/server';
import * as v from 'valibot';

import auth from '@/auth';
import { tags } from '@/lib/cache/tags';
import { resolveRegionFromHeaders } from '@/lib/geo';
import { runImport } from '@/lib/import/importRun';
import { toNdjsonLine } from '@/lib/import/ndjson';
import { ImportRequestSchema, readRequestRows } from '@/lib/import/schema';
import isSameOriginRequest, {
  crossSiteRefused,
} from '@/lib/security/sameOrigin';

const HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/x-ndjson; charset=utf-8',
} as const;

const json = (body: unknown, status: number) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

/**
 * The importer's one route: matches the rows to episodes and
 * streams one NDJSON event per batch.
 *
 * - `?dryRun=1`: asks the API what each batch would do; nothing is written.
 * - with `importId`: writes through the user's import. Once the stream is
 *   done, the user's stats expire (a route handler has no `updateTag`).
 *
 * The user is the session's: the body never names one, and the API reads the
 * user from the token. A doubtful match is never written; it comes back as a
 * problem for the user to settle.
 */
export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !req.headers.get('content-type')?.includes('application/json')
  ) {
    return crossSiteRefused();
  }
  const { accessToken, user } = await auth(req);
  if (!user || !accessToken) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = v.safeParse(ImportRequestSchema, body);
  const isDryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  if (!parsed.success || (!isDryRun && !parsed.output.importId)) {
    return json({ error: 'Invalid payload' }, 400);
  }
  const { importId } = parsed.output;
  // A row that breaks the schema (a cell too long, a date out of range) comes
  // back as a `failed` problem; the others go on
  const { refused, rows } = readRequestRows(parsed.output.rows);

  if (!isDryRun) {
    const userId = user.id;
    after(() => {
      revalidateTag(tags.stats(userId), { expire: 0 });
    });
  }

  const events = runImport({
    accessToken,
    importId: isDryRun ? undefined : importId,
    now: Date.now(),
    refused,
    region: resolveRegionFromHeaders(user, req.headers),
    rows,
    signal: req.signal,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async cancel() {
      await events.return(undefined);
    },
    async pull(controller) {
      try {
        const { done, value } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(toNdjsonLine(value)));
      } catch (error) {
        console.error('[import] stream failed', error);
        controller.enqueue(
          encoder.encode(toNdjsonLine({ error: 'failed', status: 'error' })),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: HEADERS });
}
