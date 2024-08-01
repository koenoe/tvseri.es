import type { TvSeries } from '@/types/tv-series';
import { cva, cx } from 'class-variance-authority';

import Poster from '../Tiles/Poster';

// TODO: convert to Tailwind
import styles from './styles.module.css';

const innerStyles = cva(
  'flex w-full flex-nowrap overflow-x-auto overscroll-x-contain pb-20 pt-10 scrollbar-hide',
);

export const innerStylesWithModuleStyles = () => {
  return cx(innerStyles(), styles.inner);
};

type Props = React.AllHTMLAttributes<HTMLDivElement> &
  Readonly<{ items: TvSeries[] }>;

function List({ className, items, title }: Props) {
  return (
    <div className={cx('relative w-full', className)}>
      <h2 className="container text-3xl font-medium">{title}</h2>
      <div className={innerStylesWithModuleStyles()}>
        {items.map((item) => (
          <Poster key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default List;
