/**
 * Responses for the person page: links, merged credits, career,
 * collaborators, family and awards, and the viewer's watched line.
 */

export type PersonLinkType =
  | 'imdb'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'wikidata';

export type PersonLink = Readonly<{
  type: PersonLinkType;
  id: string;
  url: string;
}>;

/** `GET /person/:id/external-ids`: the Socials row, in a fixed order */
export type PersonLinks = Readonly<{
  links: ReadonlyArray<PersonLink>;
}>;

export type PersonShowUpcoming = Readonly<{
  /** `dated` has a `date` ("Premieres Jun 12"), `in-development` has none */
  state: 'dated' | 'in-development';
  date?: string;
}>;

/** One show of a person, cast and crew credits merged */
export type PersonShow = Readonly<{
  id: number;
  name: string;
  slug: string;
  /** Empty when TMDB has no poster */
  posterImage: string;
  /** YYYY-MM-DD; absent when unknown */
  firstAirDate?: string;
  year?: number;
  /** Episodes he is credited in (the most of his credits for the show) */
  episodeCount: number;
  characters: ReadonlyArray<string>;
  jobs: ReadonlyArray<string>;
  /**
   * Episodes per crew job ("Directed 2 episodes"), one entry per distinct
   * job in the order they first appear: the most TMDB gives for that job on
   * the show, 0 when missing. Only set when the show has crew credits.
   */
  crewJobs?: ReadonlyArray<Readonly<{ job: string; episodeCount: number }>>;
  /** The quiet line under the title: the characters, else the jobs */
  role: string;
  isCast: boolean;
  isCrew: boolean;
  /** Cast, one episode: the "Guest roles" filter */
  isGuest: boolean;
  /** A character marked "(voice)": the Voice filter */
  isVoice: boolean;
  upcoming?: PersonShowUpcoming;
  /** TMDB's vote count for the show: how widely seen it is (Known for) */
  voteCount?: number;
  /** TMDB's popularity, Known for's tie-break */
  popularity?: number;
}>;

/** The filter pills of the Shows list */
export type PersonShowCounts = Readonly<{
  /** shows + upcoming, without `self` */
  all: number;
  acting: number;
  guest: number;
  voice: number;
  behindTheCamera: number;
  upcoming: number;
  self: number;
}>;

/** `GET /person/:id/shows` */
export type PersonShows = Readonly<{
  counts: PersonShowCounts;
  /** Upcoming group: dated (soonest first), then in development */
  upcoming: ReadonlyArray<PersonShow>;
  /** Newest first, undated last */
  shows: ReadonlyArray<PersonShow>;
  /** "As himself": talk shows, award shows, documentaries; newest first */
  self: ReadonlyArray<PersonShow>;
}>;

/** Bar weight by episode count: 1-5 = 1, 6-20 = 2, 21+ = 3 */
export type PersonCareerWeight = 1 | 2 | 3;

/** One row of the Career chart: a series, years across */
export type PersonCareerRow = Readonly<{
  id: number;
  name: string;
  slug: string;
  /** Character, else jobs: the hover caption */
  role: string;
  episodeCount: number;
  weight: PersonCareerWeight;
  /** First and last year the show aired (a person's own span is not in TMDB) */
  startYear: number;
  endYear: number;
  /** Still airing: the bar runs to today */
  ongoing: boolean;
  /**
   * The years the show aired, ascending, within `startYear`..`endYear`: a
   * year without a season is a break in the bar. Absent when TMDB has no
   * seasons (draw one continuous bar).
   */
  years?: ReadonlyArray<number>;
}>;

/** Announced work past "Today": no years, pink */
export type PersonCareerUpcoming = Readonly<{
  id: number;
  name: string;
  slug: string;
  role: string;
  episodeCount: number;
  state: 'dated' | 'in-development';
  /** YYYY-MM-DD, only when `state` is `dated` */
  date?: string;
}>;

export type PersonCareerGuestTick = Readonly<{
  id: number;
  name: string;
  year: number;
}>;

/** `GET /person/:id/career`: the Career chart */
export type PersonCareer = Readonly<{
  /** Series (not guest roles), oldest start first */
  rows: ReadonlyArray<PersonCareerRow>;
  /** The "Guest roles" row: one tick per one-off role */
  guest: Readonly<{
    count: number;
    firstYear?: number;
    lastYear?: number;
    ticks: ReadonlyArray<PersonCareerGuestTick>;
  }>;
  upcoming: ReadonlyArray<PersonCareerUpcoming>;
}>;

/** A person who shares shows with the person */
export type PersonCollaborator = Readonly<{
  id: number;
  name: string;
  slug: string;
  image: string;
  /** "Actor", or the job they share most ("Director", "Writer") */
  role: string;
  /** As cast: their character with the most episodes across the shared shows, self roles left out ("Lois") */
  character?: string;
  /** Number of the person's shows they are in too (2 or more) */
  count: number;
  /** Episodes they share across those shows */
  episodeCount: number;
  showIds: ReadonlyArray<number>;
}>;

/** `GET /person/:id/collaborators`, most shows first */
export type PersonCollaborators = Readonly<{
  collaborators: ReadonlyArray<PersonCollaborator>;
}>;

export type PersonSpouse = Readonly<{
  /** Wikidata item id */
  id: string;
  name: string;
  /** Years of the marriage; no `endYear` = still married as far as known */
  startYear?: number;
  endYear?: number;
  /** TMDB person id, only when Wikidata knows it (P4985) */
  tmdbId?: number;
  /** Person-page slug, only with `tmdbId` */
  slug?: string;
}>;

export type PersonChild = Readonly<{
  id: string;
  name: string;
  relation: 'daughter' | 'son' | 'child';
  /** TMDB person id, only when Wikidata knows it (P4985) */
  tmdbId?: number;
  /** Person-page slug, only with `tmdbId` */
  slug?: string;
}>;

export type PersonFamily = Readonly<{
  /** Oldest marriage first */
  spouses: ReadonlyArray<PersonSpouse>;
  children: ReadonlyArray<PersonChild>;
}>;

export type PersonAward = Readonly<{
  /** Wikidata label, e.g. "Tony Award for Best Actor in a Play" */
  award: string;
  /** The family it counts under: "Emmy", "Tony", "Golden Globe"... */
  group: string;
  won: boolean;
  year?: number;
  /** The work it was for, when Wikidata knows */
  work?: string;
}>;

export type PersonAwardGroup = Readonly<{
  name: string;
  wins: number;
  nominations: number;
}>;

export type PersonAwards = Readonly<{
  wins: number;
  /** Nominations that did not become a win */
  nominations: number;
  /** wins + nominations: "All 87 nominations" */
  total: number;
  /** Most wins first */
  groups: ReadonlyArray<PersonAwardGroup>;
  /** Every award, wins first then newest: the "All nominations" page */
  items: ReadonlyArray<PersonAward>;
}>;

/**
 * `GET /person/:id/family-and-awards` (Wikidata, matched on the IMDb id).
 * Each part is `null` when Wikidata has nothing: show it only when present.
 */
export type PersonFamilyAndAwards = Readonly<{
  family: PersonFamily | null;
  awards: PersonAwards | null;
  /** Wikidata didn't answer: both halves are empty for now (`no-store`) */
  degraded?: true;
}>;

/** The viewer's progress in one of the person's shows */
export type PersonWatchedItem = Readonly<{
  seriesId: number;
  /** `watched` = the show is finished, `in-progress` = some episodes */
  state: 'watched' | 'in-progress';
  /** Episodes the viewer watched, at most the episodes he is credited in */
  episodesWatched: number;
  /** Episodes he is credited in (0 when TMDB has no count) */
  episodeCount: number;
}>;

/**
 * `GET /me/person/:id/watched` (`private, no-store`): "Watched 74 episodes,
 * 3 of 67 shows" and the per-show marks. Shows he only appears in as
 * himself are not counted.
 */
export type PersonWatched = Readonly<{
  /** Sum of `episodesWatched` */
  episodes: number;
  /** Of his shows (merged credits, upcoming included, no "Self") the viewer watched at least one episode of */
  shows: number;
  /** His shows: `counts.all` of `/person/:id/shows` */
  totalShows: number;
  /** Most episodes first */
  items: ReadonlyArray<PersonWatchedItem>;
}>;
