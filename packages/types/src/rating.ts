// TODO: revise for other ratings when needed
export type Rating = Readonly<{
  popular: number;
  score: number;
  source: string;
  value: number;
  votes: number;
  imdbid: string;
}>;
