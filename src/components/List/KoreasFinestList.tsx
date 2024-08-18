import { fetchKoreasFinestTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await fetchKoreasFinestTvSeries();

  return (
    <List title="Korea's finest" {...props}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
