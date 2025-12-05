import { type NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Next.js recommends against data fetching in proxy, but we must refresh
  // auth tokens here. OpenAuth rotates refresh tokens on every use, so we
  // can't refresh in RSC (which can't persist cookies). The proxy is our
  // only chance to refresh tokens before they expire.
  //
  // Important: The proxy runs once per navigation, preventing multiple
  // concurrent refreshes. Without this, parallel RSC requests could each
  // attempt to refresh, creating multiple new refresh tokens where only
  // one survives the reuse window — logging the user out.
  await auth(req, res);

  return res;
}
