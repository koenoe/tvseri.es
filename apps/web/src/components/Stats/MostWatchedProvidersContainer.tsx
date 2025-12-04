import { getStatsProviders } from '@/lib/api';

import MostWatchedProviders from './MostWatchedProvidersLazy';

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

export default async function MostWatchedProvidersContainer({
  userId,
  year,
}: Input) {
  const data = await getStatsProviders({ userId, year });
  return <MostWatchedProviders data={data} />;
}
