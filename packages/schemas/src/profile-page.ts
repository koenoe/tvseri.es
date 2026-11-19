/** Responses for the profile page */

import type { ListItem } from './list';

/** One finished show that is coming back (Coming up's Later and No date yet rows) */
export type WaitingForItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  /** When the viewer finished it (ms): the start of the 4px wait line */
  finishedAt?: number;
  /** `dated`: "59 days to go"; `renewed`: coming back, "No date yet" */
  state: 'dated' | 'renewed';
  /** The season that is coming (S03) */
  nextSeason: number;
  /**
   * `dated` only: YYYY-MM-DD, the days to it, its episode number and what
   * it is to its season (a show finished mid-season waits for an episode or
   * the finale, not for a season)
   */
  nextDate?: string;
  daysToGo?: number;
  nextEpisode?: number;
  nextKind?: 'season-premiere' | 'season-finale' | 'episode';
  /** `renewed` only: YYYY-MM-DD of the last regular episode to air ("Last aired Sep 2025") */
  lastAired?: string;
  /**
   * `renewed` only: the coming season's episode count when TMDB lists it
   * without a date ("S03 · 8 episodes listed"); absent when nothing is listed
   */
  listedEpisodes?: number;
}>;

/** The full overview's finished shows that are coming back */
export type WaitingFor = Readonly<{
  /** Dated first (soonest), then renewed by when each is probably back (`byExpectedReturn`) */
  items: ReadonlyArray<WaitingForItem>;
}>;

export type TasteLevel =
  | 'very-low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high'
  | 'super';

/** A show named in the match card or the New to you picks */
export type TasteShow = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string;
  /**
   * New to you picks only: why the owner has it ("Favourite", "Finished",
   * "Watching" under the poster). Favourites win over finished.
   */
  reason?: 'favourite' | 'finished' | 'watching';
}>;

/** What is next for a shared show, from the show's facts ("You both watch") */
export type SharedShowNext = Readonly<
  | {
      /** "S03 · Thu 7 Jan": a later season has a premiere date */
      kind: 'season-premiere';
      season: number;
      /** YYYY-MM-DD */
      date: string;
    }
  | {
      /** "S02E03 · Sun 15 Nov": the next episode of the airing season */
      kind: 'episode';
      season: number;
      episode: number;
      date: string;
    }
  | {
      /** "S02 out now": the latest season aired within the last 14 days */
      kind: 'season-out';
      season: number;
    }
>;

/** A show in both libraries, with what the two of you have in common */
export type SharedShow = TasteShow &
  Readonly<{
    /**
     * Strongest first: both favourited ("You both love it"), both finished
     * ("You both finished it", "You're both up to date"), anything else
     * shared ("You're both watching")
     */
    relation: 'both-favourite' | 'both-finished' | 'both-watching';
    /**
     * both-finished (each has every aired episode): the show has ended
     * ("You both finished it") or is still running ("You're both up to
     * date"); null for the other relations
     */
    finished: 'ended' | 'up-to-date' | null;
    next: SharedShowNext | null;
    /** The first air year (2019), left out when unknown */
    year?: number;
    /** Regular seasons ("3 seasons"), left out when there are none */
    seasonCount?: number;
    /**
     * The show's first TMDB genre id, left out when it has none. An id, not
     * a name: TMDB's TV genre list is fixed and the web names it, so the
     * match needs no genre list read.
     */
    genreId?: number;
  }>;

/** One side of "Where your tastes split": a genre only one of you watches */
export type TasteSplitGenre = Readonly<{
  /** TMDB genre name */
  genre: string;
  /** TMDB genre id: the row opens its landing */
  genreId: number;
  ownerCount: number;
  viewerCount: number;
}>;

/** `GET /user/:id/match`: the visitor's view of another profile */
export type TasteMatchResponse = Readonly<{
  match: Readonly<{
    /** `null` under 5 shared shows: "Not enough shared yet", an unlit meter */
    level: TasteLevel | null;
    /** Shows in both libraries (watched, watching or favourited) */
    sharedCount: number;
    notEnough: boolean;
    /** Strongest first (both favourited, then both finished): the hover and the card links */
    sharedShows: ReadonlyArray<SharedShow>;
  }>;
  /** The profile owner follows the viewer: "Follows you" */
  followsYou: boolean;
  /** The viewer follows the profile owner: Following / Follow */
  following: boolean;
  /** The owner's favourites, finished and in-progress shows that are in none of the viewer's lists (watchlist included), in that order (at most 6); `reason` says which */
  newToYou: ReadonlyArray<TasteShow>;
  /**
   * "Where your tastes split": the owner's biggest genre the viewer
   * has none (or almost none) of, and the viewer's biggest genre the owner
   * has almost none of; null when there is no such genre.
   */
  split: Readonly<{
    theirs: TasteSplitGenre | null;
    yours: TasteSplitGenre | null;
  }>;
}>;

/** One person behind a From your circle pick */
export type CirclePerson = Readonly<{
  id: string;
  username: string;
  level: TasteLevel | null;
}>;

/** A show from your circle you haven't seen ("From your circle") */
export type CirclePick = Readonly<{
  show: TasteShow;
  /** What the people did with it: the card's line ("A favourite of your closest match.") */
  kind: 'favourite' | 'finished';
  /** Closest match first; one or two people */
  people: ReadonlyArray<CirclePerson>;
  /**
   * The show's main genre when you have no show of it, for a door line
   * ("juno's door to anime."); null otherwise
   */
  doorGenre: string | null;
}>;

/** `GET /me/circle`: three picks from the people you follow, closest match first */
export type Circle = Readonly<{
  picks: ReadonlyArray<CirclePick>;
  /** How many people you follow (0: "Nobody in your circle yet") */
  followingCount: number;
}>;

/** What the favourites accordion shows per tile (`?include=facts` on list reads) */
export type ListItemFacts = Readonly<{
  backdropImage: string;
  /** Regular seasons that have started airing (`seasonsOutlook`) */
  seasonCount: number;
  /**
   * The season TMDB lists after the last one to air, for a returning show
   * ("S02 renewed"); null otherwise. Absent from an API older than the field.
   */
  renewedSeason?: number | null;
  /** TMDB type: Miniseries, Scripted... */
  type: string | null;
  /** TMDB status: Ended, Canceled, Returning Series... */
  status: string;
  /** Estimate in minutes (episode runtime × episodes), null when unknown */
  totalRuntime: number | null;
  /** The list owner's own state of the show: "Finished Nov 3", "Watching S02", "Up to date" */
  progress: Readonly<
    | { state: 'finished'; finishedAt: number }
    | { state: 'watching'; season: number }
    | { state: 'up-to-date' }
    | { state: 'none' }
  >;
}>;

/** A list item read with `?include=facts`; `facts` is null when TMDB doesn't know the show */
export type ListItemWithFacts = ListItem &
  Readonly<{ facts: ListItemFacts | null }>;

/** One show in the Season ledger: holes in the record */
export type LedgerShow = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  /** Regular seasons: the "26 seasons" and the numbered line */
  seasonCount: number;
  missingCount: number;
  /** Only seasons with holes: "3 episodes missing" per season */
  seasons: ReadonlyArray<Readonly<{ season: number; missing: number }>>;
  /** The missing episodes, in order (`GET /me/ledger/:seriesId` names them) */
  episodes: ReadonlyArray<string>;
}>;

/** `GET /me/ledger`: shows with holes, most holes first ("Next: <show>" is the second) */
export type Ledger = Readonly<{
  shows: ReadonlyArray<LedgerShow>;
}>;

export type LedgerEpisode = Readonly<{
  /** `S08E05` */
  code: string;
  season: number;
  episode: number;
  title: string;
  /** YYYY-MM-DD; '' when unknown */
  airDate: string;
}>;

/** `GET /me/ledger/:seriesId`: the missing episodes of one show, named */
export type LedgerDetail = Readonly<{
  seriesId: number;
  episodes: ReadonlyArray<LedgerEpisode>;
}>;

/** Up next / Continue watching: one in-progress show and its next episode */
export type UpNextItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  season: number;
  episode: number;
  /** `S05E05` */
  code: string;
  /** Only the first few items carry these (one TMDB season call each) */
  episodeTitle?: string;
  /** YYYY-MM-DD */
  airDate?: string;
  /** The episode is the latest one to air: "Latest episode" */
  isLatest: boolean;
  /** "1 of 8 watched · 1 to watch" */
  seasonWatched: number;
  seasonTotal: number;
  /**
   * The season's first episode number; absent means 1. TMDB numbers some
   * shows on across seasons (Naruto Shippuden S2 = E33…E53).
   */
  firstEpisodeNumber?: number;
  toWatch: number;
  /**
   * The season's aired episodes watched or skipped: the line's fill (done
   * counts skips). Optional: the web (Vercel) and the API (Lambda) go live
   * apart in one deploy, so the new web can read an answer without it;
   * nothing caches it longer (`/me/overview` is private, no-store).
   */
  seasonDone?: number;
  /**
   * The next episode's minutes, and what the season has left ("4 left · 3h
   * 50m"): each episode's own runtime summed, by the show page's rule
   * (`minutesFor` in `@tvseri.es/utils`); null when unknown
   */
  runtime: number | null;
  timeLeftMinutes: number | null;
  /**
   * The season's minutes per episode (index = episode − 1, gaps filled by
   * the same rule, 0 unknown), so a client can sum the time left again
   * after a mark. Absent from older answers.
   */
  seasonRuntimes?: ReadonlyArray<number>;
  /** The next episode is the season's last and all aired: "Season finale" */
  seasonFinale: boolean;
  /** The next episode still to air: "Next Sun 15 Nov", else "Next season TBA" when `nextSeasonTba` */
  nextToAir: Readonly<{
    season: number;
    episode: number;
    airDate: string;
  }> | null;
  nextSeasonTba: boolean;
  lastWatchedAt: number | null;
  /** `S02E01` */
  lastWatchedCode: string | null;
}>;

/** A season one or two aired episodes from its end ("Almost done") */
export type AlmostDoneItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  season: number;
  /** 1 or 2 */
  toGo: number;
  /** The next to watch */
  code: string;
  /** Episodes in the season (regular, all aired) */
  seasonTotal: number;
  /**
   * The season's first episode number; absent means 1. TMDB numbers some
   * shows on across seasons (Naruto Shippuden S2 = E33…E53).
   */
  firstEpisodeNumber?: number;
  /** The season's episode numbers still to watch, wherever they sit (`toGo` of them) */
  unwatchedEpisodes: ReadonlyArray<number>;
  /** "52m to finish the season" */
  timeLeftMinutes: number | null;
}>;

/** An Out now row: a new episode, or a whole season that just finished airing */
export type OutNowItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  kind: 'episode' | 'season-complete';
  season: number;
  /** `episode` rows */
  episode?: number;
  code?: string;
  /** `season-complete` rows: how many are unwatched */
  episodes?: number;
  /** YYYY-MM-DD: when the episode, or the season's last episode, aired */
  airDate: string;
  runtimeMinutes: number | null;
}>;

/** "S06 premieres Sun 15 Nov" under a Catching up show */
export type PremiereRunway = Readonly<{
  season: number;
  date: string;
  /** Negative-free: 0 on the day. `out` = the season has premiered already */
  daysToGo: number;
  state: 'upcoming' | 'out';
}>;

/** Several aired episodes waiting for one show */
export type CatchingUpItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  waiting: number;
  runtimeMinutes: number | null;
  /** The waiting episodes in order, at most 8 */
  episodes: ReadonlyArray<string>;
  /** Each of `episodes`' own minutes (`episodeMinutes`), 0 when unknown: a chip's "2h 52m left" */
  episodeRuntimes: ReadonlyArray<number>;
  /** Next up: the first of them */
  nextUp: string;
  runtime: number | null;
  runway: PremiereRunway | null;
}>;

/** A ticket in Coming up (the next 30 days) */
export type ComingUpItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  date: string;
  daysToGo: number;
  season: number;
  episode: number;
  kind: 'season-premiere' | 'season-finale' | 'episode';
  /**
   * A premiere: do all its episodes air at once? An episode: `weekly` when
   * one before it in the season aired on another day. `null` when unknown
   * (and for a finale)
   */
  release: 'weekly' | 'full-season' | null;
  onWatchlist: boolean;
  /** Where to watch in the viewer's country, when known */
  provider: Readonly<{ name: string; logoImage: string }> | null;
  /** A finished show's return: when the viewer finished it (ms), for "Back after 9 months" */
  finishedAt?: number;
}>;

/** In-progress shows not watched for over 3 months: "Still watching?" */
export type PausedItem = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  posterImage: string;
  lastWatchedAt: number;
  lastWatchedCode: string;
}>;

/** `GET /me/overview`: every tracker and calendar block of the profile page */
export type Overview = Readonly<{
  /** Most recently watched first; the first is the sidebar's Up next tile */
  upNext: ReadonlyArray<UpNextItem>;
  almostDone: Readonly<{
    items: ReadonlyArray<AlmostDoneItem>;
    /** The show closest to its season's end, for "Closest is X, 4 episodes to go" (null when none) */
    closest: Readonly<{ seriesId: number; title: string; toGo: number }> | null;
  }>;
  /** Newest first */
  outNow: ReadonlyArray<OutNowItem>;
  catchingUp: ReadonlyArray<CatchingUpItem>;
  /** Soonest first; the first also answers "Next: The Rings of Power, Wed Nov 11" for an empty Out now */
  comingUp: ReadonlyArray<ComingUpItem>;
  /**
   * A show Coming up follows has a date past its 30 days: the calendar has
   * more than Coming up shows. Not in `?view=up-next`.
   */
  datedLater?: boolean;
  /** Most recently watched first */
  paused: ReadonlyArray<PausedItem>;
  /** The finished shows coming back more than 30 days out or undated (computed once per profile view). Not in `?view=up-next`. */
  waitingFor?: WaitingFor;
}>;
