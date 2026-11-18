/** A trending show as the 404 uses it: a poster link and a pick. */
export type NotFoundShow = Readonly<{
  id: number;
  poster: string;
  slug: string;
  title: string;
}>;

/** “Pick one for me” only needs where to go. */
export type PickableShow = Readonly<{ id: number; slug: string }>;
