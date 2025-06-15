import { fetchKoreasFinestTvSeries } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  try {
    const items = await fetchKoreasFinestTvSeries();

    return (
      <List title="Korea's finest" scrollRestoreKey="koreas-finest" {...props}>
        {items.map((item) => (
          <Poster key={item.id} item={item} />
        ))}
      </List>
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}
