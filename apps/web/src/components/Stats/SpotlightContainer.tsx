import { getStatsSpotlight } from '@/lib/api';

import Spotlight from './Spotlight';

export default async function SpotlightContainer({
  userId,
  year,
  boundary,
}: Readonly<{
  userId: string;
  year: number;
  boundary: 'first' | 'last';
}>) {
  const spotlight = await getStatsSpotlight({ userId, year });
  const item = boundary === 'first' ? spotlight.first : spotlight.last;

  if (!item) {
    return null;
  }

  return <Spotlight item={item} />;
}
