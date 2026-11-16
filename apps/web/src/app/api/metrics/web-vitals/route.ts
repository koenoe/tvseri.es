/**
 * POST /api/metrics/web-vitals
 *
 * Forwards the browser's sampled web-vitals batch (`WebVitals`) to the API,
 * adding the visitor's country from the geo headers. The API validates the
 * records; this handler only refuses another site's request (403, before
 * reading it: each forward is a function run and an API write), caps the
 * body (413) and requires a JSON object or array (400). Answers 204, or the API's error status (500 when the API
 * is unreachable or times out).
 */
import type { NextRequest } from 'next/server';

import { ApiError, apiFetch } from '@/lib/api/client';
import { getRegionFromHeaders } from '@/lib/geo';
import isSameOriginRequest, {
  crossSiteRefused,
} from '@/lib/security/sameOrigin';

// The API takes at most 50 records per batch; a record is well under 1 KB.
const MAX_BODY_BYTES = 64 * 1024;

/** The body as text, or null once it grows past `maxBytes`. */
async function readText(
  request: NextRequest,
  maxBytes: number,
): Promise<string | null> {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    return null;
  }
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return text + decoder.decode();
    }
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return crossSiteRefused();
  }
  const text = await readText(request, MAX_BODY_BYTES);
  if (text === null) {
    return new Response(null, { status: 413 });
  }

  const body = parseJson(text);
  if (!Array.isArray(body) && !isRecord(body)) {
    return new Response(null, { status: 400 });
  }

  const country = getRegionFromHeaders(request.headers, 'unknown');
  const withCountry = (metric: unknown) =>
    isRecord(metric) ? { ...metric, country } : metric;

  try {
    await apiFetch('/metrics/web-vitals', {
      body: Array.isArray(body) ? body.map(withCountry) : withCountry(body),
      method: 'POST',
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[metrics] Failed to forward web vitals:', error);
    const status =
      error instanceof ApiError && error.status >= 400 ? error.status : 500;
    return new Response(null, { status });
  }
}
