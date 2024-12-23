import { getWatchedCountByDate } from '@/lib/db/watched';

import Block from './Block';

export default async function BlockEpisodesWatched({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number;
}>) {
  const count = await getWatchedCountByDate({
    userId,
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31`),
  });

  return <Block label="Episodes watched" value={count.toLocaleString()} />;
}
