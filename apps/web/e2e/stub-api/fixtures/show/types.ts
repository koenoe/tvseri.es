/** A person on a cast list or an episode: `img` is a board image name, if any. */
export type RawPerson = Readonly<{
  id: number;
  img?: string;
  name: string;
  role: string;
}>;

export type RawEpisode = Readonly<{
  airDate: string;
  crew: Readonly<{
    director: string;
    dp: string;
    editor: string;
    writer: string;
  }>;
  guests: ReadonlyArray<RawPerson>;
  /** IMDb rating; null when OMDb has none. */
  imdb: number | null;
  /** The episode's overview; a shared invented summary when left out. */
  overview?: string;
  number: number;
  runtime: number;
  season: number;
  /** Board image name for the still. */
  still: string;
  title: string;
}>;
