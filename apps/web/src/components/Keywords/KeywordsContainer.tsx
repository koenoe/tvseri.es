import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchTvSeriesKeywords } from '@/lib/tmdb';
import { type Keyword as KeywordType } from '@/types/keyword';

import Keyword from './Keyword';

const cachedKeywords = async (id: string | number) => {
  const dynamoCacheKey = `tv:keywords:${id}`;
  const dynamoCachedItem = await getCacheItem<KeywordType[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const results = await fetchTvSeriesKeywords(id);
  const keywords = results ?? [];

  await setCacheItem(dynamoCacheKey, keywords, {
    ttl: 43200, // 12 hours
  });

  return keywords;
};

export default async function KeywordsContainer({
  tvSeriesId,
}: Readonly<{
  tvSeriesId: number | string;
}>) {
  const keywords = await cachedKeywords(tvSeriesId);

  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 self-start">
      {keywords.map((keyword) => (
        <Keyword key={keyword.id} keyword={keyword} />
      ))}
    </div>
  );
}
