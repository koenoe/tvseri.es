import { cachedUser } from '@/app/cached';
import { getListItemsCount } from '@/lib/api';

import Block from './Block';

export default async function BlockSeriesFinished({
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

  const count = await getListItemsCount({
    listId: 'WATCHED',
    userId: user.id,
  });

  return <Block label="Series finished" value={count.toLocaleString()} />;
}
