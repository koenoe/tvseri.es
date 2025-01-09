import auth from '@/lib/auth';

export async function GET() {
  const { user } = await auth();

  if (!user) {
    return Response.json(null);
  }

  return Response.json(user);
}
