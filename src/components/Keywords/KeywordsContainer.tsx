import { fetchTvSeriesKeywords } from '@/lib/tmdb';

import Keyword from './Keyword';

export default async function KeywordsContainer({
  tvSeriesId,
}: Readonly<{
  tvSeriesId: number | string;
}>) {
  const keywords = await fetchTvSeriesKeywords(tvSeriesId);

  if (!keywords || keywords.length === 0) {
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
