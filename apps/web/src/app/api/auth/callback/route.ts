import { client, setTokens } from '@/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'No code found' }, { status: 400 });
  }

  const exchanged = await client.exchange(
    code!,
    `${url.origin}/api/auth/callback`,
  );

  if (exchanged.err) {
    return Response.json(exchanged.err, { status: 400 });
  }

  await setTokens(exchanged.tokens.access, exchanged.tokens.refresh);

  return Response.redirect(`${url.origin}/`);
}
