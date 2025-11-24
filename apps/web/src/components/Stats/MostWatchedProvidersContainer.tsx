import { WATCH_PROVIDER_PREDEFINED_COLOR } from '@tvseri.es/constants';
import { cachedWatchedByYear } from '@/app/cached';
import { detectDominantColorFromImage } from '@/lib/api';
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
  const watchedItems = await cachedWatchedByYear({
    userId: input.userId,
    year: input.year,
  });

  const map = watchedItems.reduce((map, item) => {
    if (!item.watchProviderName) return map;

    const existing = map.get(item.watchProviderName);
    if (existing) {
      existing.series.add(item.seriesId);
      existing.logo ||= item.watchProviderLogoImage;
    } else {
      map.set(item.watchProviderName, {
        logo: item.watchProviderLogoImage,
        logoPath: item.watchProviderLogoPath,
        series: new Set([item.seriesId]),
      });
    }
    return map;
  }, new Map<
    string,
    { series: Set<number>; logo?: string | null; logoPath?: string | null }
  >());

  const entries = [...map.entries()];
  const stats = await Promise.all(
    entries.map(async ([name, { series, logo, logoPath }]) => ({
      count: series.size,
      defaultColor:
        WATCH_PROVIDER_PREDEFINED_COLOR[name] ||
        (logo && logoPath
          ? await detectDominantColorFromImage({
              cacheKey: logoPath,
              url: logo,
            })
          : '#000000'),
      logo,
      name,
    })),
  );

  return stats.sort((a, b) => b.count - a.count).slice(0, 10); // Limit to top 10 providers
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
