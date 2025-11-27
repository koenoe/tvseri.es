import auth from '@/auth';

export async function GET() {
  const { user } = await auth();
  return Response.json(user);
}
