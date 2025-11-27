import auth from '@/auth';

export async function GET(req: Request) {
  const { user } = await auth(req);

  if (!user) {
    return Response.json(null);
  }

  return Response.json(user);
}
