import GenreMetaItem from '@/components/ShowMeta/GenreMetaItem';
import ShowMeta from '@/components/ShowMeta/ShowMeta';
import type { SpotlightTvSeries } from '@/utils/toSpotlightTvSeries';

/**
 * The show line on the home hero and the In progress card: first genre only,
 * no links (the whole card is the link). Centred on phones, left from md.
 */
export default function SpotlightShowMeta({
  item,
}: Readonly<{
  item: SpotlightTvSeries;
}>) {
  const genre = item.genres[0]?.name;

  return (
    <ShowMeta
      className="w-full justify-center md:justify-start"
      numberOfSeasons={item.numberOfSeasons}
      releaseYear={item.releaseYear}
    >
      <GenreMetaItem>{genre}</GenreMetaItem>
    </ShowMeta>
  );
}
