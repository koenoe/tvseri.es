import { cachedUser } from '@/app/cached';
import { getWatchedRuntime } from '@/lib/api';
import formatRuntime from '@/utils/formatRuntime';

import Block from './Block';

export default async function BlockTotalRuntime({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const user = await cachedUser({ username });

  if (!user) {
    return null;
  }

  const totalRuntime = await getWatchedRuntime({ userId: user.id });

  return (
    <Block label="Total runtime" value={formatRuntime(totalRuntime, false)} />
  );
}
