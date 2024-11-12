import { unstable_cache } from 'next/cache';

import { fetchKoreasFinestTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

const cachedKoreasFinestTvSeries = unstable_cache(
  async () => {
    const items = await fetchKoreasFinestTvSeries();
    return items;
  },
  ['koreas-finest'],
  {
    revalidate: 604800, // 1 week
  },
);

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const tvSeries = await cachedKoreasFinestTvSeries();

  return (
    <List title="Korea's finest" scrollRestoreKey="koreas-finest" {...props}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
