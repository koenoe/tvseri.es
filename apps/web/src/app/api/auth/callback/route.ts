import { client } from '@/auth/client';
import { consumeLogin, LOGIN_CALLBACK_PATH } from '@/auth/login';
import { createSession } from '@/auth/session';

export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Always clear the login cookie, also when the flow failed.
  const login = await consumeLogin(searchParams.get('state'));

  if (error) {
    return Response.json({ error, error_description }, { status: 400 });
  }

  if (!code) {
    return Response.json({ error: 'No code found' }, { status: 400 });
  }

  if (!login) {
    // E.g. login started in two tabs: the cookie holds the other tab's state.
    // The state is unusable, so send the visitor home to click login again.
    return Response.redirect(new URL('/', origin));
  }

  let exchanged: Awaited<ReturnType<typeof client.exchange>>;
  try {
    exchanged = await client.exchange(
      code,
      `${origin}${LOGIN_CALLBACK_PATH}`,
      login.verifier,
    );
  } catch (err) {
    console.error('[auth] [Callback] exchange unavailable:', err);
    return Response.json(
      { error: 'Authentication service unavailable' },
      { status: 503 },
    );
  }

  if (exchanged.err) {
    return Response.json(exchanged.err, { status: 400 });
  }

  await createSession(exchanged.tokens);

  // `returnTo` is a validated same-origin path (see `toSafeReturnTo`).
  return Response.redirect(new URL(login.returnTo, origin));
}
