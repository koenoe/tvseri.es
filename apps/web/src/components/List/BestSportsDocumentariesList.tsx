import { fetchBestSportsDocumentariesTvSeries } from '@/lib/api';
import Poster from '../Tiles/Poster';
import List, { type HeaderVariantProps } from './List';

export default async function BestSportsDocumentariesList(
  props: React.AllHTMLAttributes<HTMLDivElement> & HeaderVariantProps,
) {
  const items = await fetchBestSportsDocumentariesTvSeries();

  return (
    <List
      scrollRestoreKey="best-sports-documentaries"
      title="Best sports documentaries"
      {...props}
    >
      {items.map((item) => (
        <Poster item={item} key={item.id} />
      ))}
    </List>
  );
}
