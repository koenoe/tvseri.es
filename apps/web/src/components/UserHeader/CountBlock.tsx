import { findUser, getProfileCount, type ProfileCount } from '@/lib/api';

import Block from './Block';

const formatCount = (value: number) => value.toLocaleString();

/**
 * One count of the profile header. Each block fetches its own count in its
 * own Suspense boundary, so they stream in independently. The username lookup
 * they all start with is one request (apiFetch dedupes it per render).
 */
export default async function CountBlock({
  count,
  format = formatCount,
  label,
  params,
}: Readonly<{
  count: ProfileCount;
  format?: (value: number) => string;
  label: string;
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const user = await findUser({ username });

  if (!user) {
    return null;
  }

  const value = await getProfileCount(user.id, count);

  return <Block label={label} value={format(value)} />;
}
