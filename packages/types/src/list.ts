import { type TvSeries } from './tv-series';

// export type List = Readonly<{
//   id: string;
//   title: string;
//   description?: string;
//   createdAt: number;
// }>;

export type ListItem = Pick<
  TvSeries,
  'id' | 'posterImage' | 'posterPath' | 'title' | 'slug' | 'status'
> &
  Readonly<{
    position?: number;
    createdAt?: number;
  }>;
