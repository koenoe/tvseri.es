import type { TvSeries } from './tv-series';

/** One rabbit hole: from a trending show to something it leads to */
export type GoDeeperCard = Readonly<{
  /** `theme` = a keyword the show is tagged with, `creator` = who made it, `network` = where it aired */
  kind: 'theme' | 'creator' | 'network';
  /** One plain line saying why the destination follows from the show */
  why: string;
  /** The trending show the card starts from; `rank` is its place in this week's trending list (1 = first) */
  from: Readonly<{ id: number; title: string; rank: number }>;
  /**
   * Where it leads. `slug` is the landing slug (`/theme/{slug}`,
   * `/network/{slug}`) or the person's name slug (`/person/{id}/{slug}`).
   */
  to: Readonly<{ id: number; name: string; slug: string }>;
  /** Every show of the destination ("All N"): TMDB count, or credits for a person */
  total: number;
  /** Three shows, none of them the row above or the show the card starts from */
  items: ReadonlyArray<TvSeries>;
}>;

export type GoDeeper = Readonly<{
  date: string;
  /** The network of today's Essentials row, rotated by day */
  essentials: Readonly<{
    network: Readonly<{ id: number; name: string; slug: string }>;
    /** Every show of the network ("All 244 shows") */
    total: number;
    /** Highest rated first, 250+ votes, with posters */
    items: ReadonlyArray<TvSeries>;
  }>;
  /** Up to three cards: theme, creator, network; each without shows of the row above it */
  cards: ReadonlyArray<GoDeeperCard>;
}>;
