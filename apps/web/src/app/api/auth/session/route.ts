import type { NextRequest } from 'next/server';
import auth from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth(req);

  if (!session.accessToken) {
    return Response.json({
      accessToken: null,
      expiresAt: null,
      user: null,
    });
  }

  return Response.json({
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    user: session.user,
  });
}
