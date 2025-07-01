import { headers } from 'next/headers';
import { cachedWatchedByYear } from '@/app/cached';
import { fetchWatchProviders } from '@/lib/api';
import MostWatchedProviders from './MostWatchedProvidersLazy';

type StreamingServiceStat = {
  name: string;
  count: number;
  logo?: string | null;
  defaultColor: string;
};

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

const getStreamingServiceStats = async (
  input: Input,
): Promise<StreamingServiceStat[]> => {
  const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  const [watchedItems, watchProviders] = await Promise.all([
    cachedWatchedByYear({
      userId: input.userId,
      year: input.year,
    }),
    fetchWatchProviders(region, {
      includeColors: true,
    }),
  ]);

  // Create a map to track unique series per provider
  const serviceMap = watchedItems.reduce((map, item) => {
    if (!item.watchProviderName) return map;

    const existing = map.get(item.watchProviderName);
    if (existing) {
      existing.series.add(item.seriesId);
      existing.logo ||= item.watchProviderLogoImage;
    } else {
      map.set(item.watchProviderName, {
        logo: item.watchProviderLogoImage,
        series: new Set([item.seriesId]),
      });
    }
    return map;
  }, new Map<string, { series: Set<number>; logo?: string | null }>());

  // Convert the map to an array of stats
  return [...serviceMap.entries()]
    .map(([name, { series, logo }]) => ({
      count: series.size,
      defaultColor:
        watchProviders.find((provider) => provider.name === name)?.color ||
        '#000000',
      logo,
      name,
    }))
    .sort((a, b) => b.count - a.count);
};

const cachedStreamingServiceStats = async (input: Input) => {
  const stats = await getStreamingServiceStats(input);
  return stats;
};

export default async function MostWatchedProvidersContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  const data = await cachedStreamingServiceStats({ userId, year });
  return <MostWatchedProviders data={data} />;
}
