import { unstable_cacheLife } from 'next/cache';

import { fetchKoreasFinestTvSeries } from '@/lib/tmdb';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  'use cache';

  unstable_cacheLife('weeks');

  const tvSeries = await fetchKoreasFinestTvSeries();

  return (
    <List title="Korea's finest" scrollRestoreKey="koreas-finest" {...props}>
      {tvSeries.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
