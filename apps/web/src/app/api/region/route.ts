import type { NextRequest } from 'next/server';

import auth from '@/auth';
import { resolveRegionFromHeaders } from '@/lib/geo';
import { REGION_CACHE_CONTROL } from '@/lib/region/regionUrl';

/**
 * The viewer's region for Discover's "Streaming in …" line: the saved
 * country when signed in, else Vercel's geo header (`x-vercel-ip-country`),
 * else US (`lib/geo`). It reads the request, so it runs per request (Next
 * docs, "Route Handlers" › "With Cache Components") and keeps the Discover
 * page itself fully static. The browser keeps the answer for a day
 * (`private`, so never a shared cache): one call per browser per day, and a
 * new URL when the viewer signs in or out (`regionUrl`).
 */
export async function GET(req: NextRequest) {
  const { user } = await auth(req);
  return Response.json(
    { region: resolveRegionFromHeaders(user, req.headers) },
    { headers: { 'Cache-Control': REGION_CACHE_CONTROL } },
  );
}
