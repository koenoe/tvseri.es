import { fetchKoreasFinestTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function KoreasFinestList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchKoreasFinestTvSeries();

  return (
    <List scrollRestoreKey="koreas-finest" title="Korea's Finest" {...props}>
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
