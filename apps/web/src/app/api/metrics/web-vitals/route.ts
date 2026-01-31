import type { NextRequest } from 'next/server';

const apiKey = process.env.API_KEY!;
const apiUrl = process.env.API_URL!;

/**
 * POST /api/metrics/web-vitals
 *
 * Proxies web vitals metrics from the browser to the Hono API.
 * Adds CloudFront-derived headers for country detection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get country from CloudFront header (set by CDN)
    const country =
      request.headers.get('cloudfront-viewer-country') ?? 'unknown';

    // Add country to each metric record in the batch
    const enrichedBody = Array.isArray(body)
      ? body.map((metric) => ({ ...metric, country }))
      : { ...body, country };

    // Forward to Hono API
    const response = await fetch(`${apiUrl}/metrics/web-vitals`, {
      body: JSON.stringify(enrichedBody),
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      method: 'POST',
    });

    if (!response.ok) {
      console.error('[metrics] API error:', response.status);
      return new Response(null, { status: response.status });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[metrics] Failed to proxy metric:', error);
    return new Response(null, { status: 500 });
  }
}
