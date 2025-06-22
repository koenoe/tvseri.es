import { fetchBestSportsDocumentariesTvSeries } from '@/lib/api';

import List, { type HeaderVariantProps } from './List';
import Poster from '../Tiles/Poster';

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchBestSportsDocumentariesTvSeries();

  return (
    <List
      title="Best sports documentaries"
      scrollRestoreKey="best-sports-documentaries"
      {...props}
    >
      {items.map((item) => (
        <Poster key={item.id} item={item} />
      ))}
    </List>
  );
}
