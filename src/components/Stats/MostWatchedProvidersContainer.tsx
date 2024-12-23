import { cachedWatchedByYear } from '@/lib/cached';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';

import MostWatchedProviders from './MostWatchedProviders';

type StreamingServiceStat = {
  name: string;
  count: number;
  logo?: string | null;
  defaultColor: string;
};

const PREDEFINED_COLORS: Record<string, string> = {
  'Amazon Prime Video': '#00A8E1',
  'BBC iPlayer': '#FF4E98',
  'Disney+': '#0E47BA',
  Max: '#0046FF',
  Netflix: '#E50914',
  Unknown: '#000000',
};

export const getStreamingServiceStats = async (
  input: Readonly<{
    userId: string;
    year: number | string;
  }>,
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
    const serviceName = item.watchProviderName || 'Unknown';

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
        (logo ? await detectDominantColorFromImage(logo) : '#000000'),
    }),
  );

  const stats = await Promise.all(statsPromises);

  return stats.sort((a, b) => b.count - a.count);
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
  const data = await getStreamingServiceStats({ userId, year });

  return <MostWatchedProviders data={data} />;
}
