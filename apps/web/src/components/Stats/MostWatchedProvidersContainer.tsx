import { cachedWatchedByYear } from '@/app/cached';
import { detectDominantColorFromImage } from '@/lib/api';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';

import MostWatchedProviders from './MostWatchedProviders';

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

const PREDEFINED_COLORS: Record<string, string> = {
  'Amazon Prime Video': '#00A8E1',
  'BBC iPlayer': '#FF4E98',
  'Disney+': '#0E47BA',
  Max: '#0046FF',
  Netflix: '#E50914',
  Unknown: '#000000',
};

const getStreamingServiceStats = async (
  input: Input,
): Promise<StreamingServiceStat[]> => {
  const watchedItems = await cachedWatchedByYear({
    userId: input.userId,
    year: input.year,
  });

  const serviceMap = new Map<
    string,
    {
      series: Set<number>;
      logo?: string | null;
    }
  >();

  watchedItems.forEach((item) => {
    if (!item.watchProviderName) {
      return;
    }

    const serviceName = item.watchProviderName;
    const existing = serviceMap.get(serviceName);

    if (existing) {
      existing.series.add(item.seriesId);
      if (!existing.logo && item.watchProviderLogoImage) {
        existing.logo = item.watchProviderLogoImage;
      }
    } else {
      serviceMap.set(serviceName, {
        series: new Set([item.seriesId]),
        logo: item.watchProviderLogoImage,
      });
    }
  });

  const statsPromises = [...serviceMap.entries()].map(
    async ([name, { series, logo }]) => ({
      name,
      count: series.size,
      logo,
      defaultColor:
        PREDEFINED_COLORS[name] ||
        (logo
          ? await detectDominantColorFromImage({
              url: logo,
            })
          : '#000000'),
    }),
  );

  const stats = await Promise.all(statsPromises);

  return stats.sort((a, b) => b.count - a.count);
};

const cachedStreamingServiceStats = async (input: Input) => {
  const key = `most-watched-streaming-services:${input.userId}_${input.year}`;
  const cachedValue = await getCacheItem<StreamingServiceStat[]>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const stats = await getStreamingServiceStats(input);

  await setCacheItem(key, stats, { ttl: 3600 });

  return stats;
};

export default async function MostWatchedProvidersContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  // const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  // const [watchedItems, watchProviders] = await Promise.all([
  //   cachedWatchedByYear({
  //     userId,
  //     year,
  //   }),
  //   fetchWatchProviders(region),
  // ]);
  const data = await cachedStreamingServiceStats({ userId, year });

  return <MostWatchedProviders data={data} />;
}
