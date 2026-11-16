/**
 * POST /api/auth/logout
 *
 * For a plain HTML form: `<form method="post" action="/api/auth/logout">`,
 * with an optional hidden `returnTo` field. Deletes the session and display
 * cookies, revokes the refresh token after the response (best effort) and
 * redirects (303) to `returnTo` (`toSafeReturnTo`) or `/`.
 *
 * Posts from another site (`Sec-Fetch-Site` other than `same-origin`) get a
 * 403, so no other page can log a visitor out.
 */
import type { NextRequest } from 'next/server';

import { toSafeReturnTo } from '@/auth/returnTo';
import { deleteSession } from '@/auth/sessionCookies';

import { redirect } from '../redirect';

async function formReturnTo(req: NextRequest): Promise<unknown> {
  try {
    return (await req.formData()).get('returnTo');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const site = req.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') {
    return new Response(null, { status: 403 });
  }

  const returnTo = toSafeReturnTo(await formReturnTo(req));
  await deleteSession();

  return redirect(returnTo, 303);
}
