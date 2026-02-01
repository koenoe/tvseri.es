import { cacheLife } from 'next/cache';

import { fetchKoreasFinestTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

async function cachedKoreasFinestTvSeries() {
  'use cache';
  cacheLife('long');
  return fetchKoreasFinestTvSeries();
}

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await cachedKoreasFinestTvSeries();

  return (
    <List scrollRestoreKey="koreas-finest" title="Korea's Finest" {...props}>
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
