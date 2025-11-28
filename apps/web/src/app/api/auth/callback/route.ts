import { client, createSession } from '@/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    return Response.json({ error, error_description }, { status: 400 });
  }

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

  await createSession(exchanged.tokens.access, exchanged.tokens.refresh);

  return Response.redirect(`${url.origin}/`);
}
