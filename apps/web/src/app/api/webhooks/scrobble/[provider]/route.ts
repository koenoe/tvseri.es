import { fetchTokenForWebhook, proxy } from '@/lib/api';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const body = await request.text();

  const token = url.searchParams.get('token');
  if (!token) {
    return jsonResponse({ error: 'Missing token' }, 400);
  }

  try {
    const webhookToken = await fetchTokenForWebhook({ token });
    if (!webhookToken || webhookToken.type !== provider) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }
  } catch {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  try {
    const query = Object.fromEntries(url.searchParams.entries());
    const headers = {
      ...Object.fromEntries(request.headers.entries()),
      'content-type':
        request.headers.get('content-type') ||
        'application/x-www-form-urlencoded',
    };

    const result = await proxy('/scrobble/provider/:provider', {
      method: 'POST',
      params: { provider },
      query,
      headers,
      body,
    });

    return jsonResponse(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStatus =
      error && typeof error === 'object' && 'status' in error
        ? (error.status as number)
        : 500;

    return jsonResponse({ error: errorMessage }, errorStatus);
  }
}
