import { ApiError, fetchTokenForWebhook, proxy } from '@/lib/api';

const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);

  const token = url.searchParams.get('token');
  if (!token) {
    return jsonResponse({ error: 'Missing token' }, 400);
  }

  let webhookToken: Awaited<ReturnType<typeof fetchTokenForWebhook>>;
  try {
    webhookToken = await fetchTokenForWebhook({ token });
  } catch (error: unknown) {
    console.error('Failed to validate webhook token:', error);
    return jsonResponse({ error: 'Token validation unavailable' }, 502);
  }

  if (!webhookToken || webhookToken.type !== provider) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  try {
    // Plex sends `multipart/form-data` including a binary thumbnail, so the
    // body must be forwarded as raw bytes. Reading it as text would corrupt it.
    const body = await request.arrayBuffer();

    // Explicit allowlist: only the content type (including the multipart
    // boundary) is forwarded. Inbound `host`, `content-length`, `cookie`,
    // `connection` etc. must never reach the API. `proxy` adds the API key.
    const headers = {
      'content-type':
        request.headers.get('content-type') || DEFAULT_CONTENT_TYPE,
    };

    const query = Object.fromEntries(url.searchParams.entries());

    const result = await proxy('/scrobble/provider/:provider', {
      body,
      headers,
      method: 'POST',
      params: { provider },
      query,
    });

    return jsonResponse(result);
  } catch (error: unknown) {
    console.error('Failed to forward scrobble webhook:', error);
    // The API rejected the payload (4xx): pass that on so the sender can tell
    // it apart from an outage. Network errors and 5xx are a bad gateway.
    const status =
      error instanceof ApiError && error.status >= 400 && error.status < 500
        ? error.status
        : 502;
    return jsonResponse({ error: 'Failed to process webhook' }, status);
  }
}
