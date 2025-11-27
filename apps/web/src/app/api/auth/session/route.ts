import { auth } from '@/auth';

export async function GET(req: Request) {
  const session = await auth(req);
  return Response.json(session);
}
