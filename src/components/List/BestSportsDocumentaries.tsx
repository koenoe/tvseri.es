import { fetchBestSportsDocumentariesTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const sportsDocumentariesTvSeries =
    await fetchBestSportsDocumentariesTvSeries();

  return (
    <List title="Best sports documentaries" {...props}>
      {sportsDocumentariesTvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
