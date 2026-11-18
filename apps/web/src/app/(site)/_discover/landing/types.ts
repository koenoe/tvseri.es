import type { TileShow } from '../data/tileShow';

/** What a landing's poster row sends to the client per show */
export type RowShow = Readonly<
  Pick<TileShow, 'id' | 'poster' | 'slug' | 'title'>
>;

export const toRowShow = ({ id, poster, slug, title }: RowShow): RowShow => ({
  id,
  poster,
  slug,
  title,
});
