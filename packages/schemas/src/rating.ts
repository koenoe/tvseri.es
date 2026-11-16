/**
 * `GET /series/:id/rating`: the show's IMDb rating, from OMDb. MDBList's
 * `popular` and `score` are gone with it (neither web read them).
 */
export type Rating = Readonly<{
  /** The show's IMDb id (links to imdb.com) */
  imdbid: string;
  /** Always `imdb` */
  source: string;
  value: number;
  votes: number;
}>;
