import type { SearchPerson, SearchResults, TvSeries } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';

/**
 * `GET /search?q=` for the search overlay: real TMDB ids, titles and
 * images (themoviedb.org search pages), ranked the way the API ranks them
 * (match tier, then popularity; SRFinal “Ranking”). The query arrives
 * normalised (`normalizeSearchQuery`), so the keys are lowercase.
 *
 * Special queries for the error and pending states:
 * - `server error` answers 500 (the overlay's error row);
 * - `bryan cranston` answers after 1.2 s (Enter-ahead; the stale state).
 */

const POSTER = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2';
const PROFILE = 'https://image.tmdb.org/t/p/w600_and_h900_bestv2';

function show(
  id: number,
  title: string,
  slug: string,
  year: string,
  posterPath: string,
  popularity: number,
): TvSeries {
  return {
    backdropColor: '#1c2223',
    countries: [],
    createdBy: [],
    description: '',
    firstAirDate: `${year}-01-01`,
    genres: [],
    hasAired: true,
    id,
    isAdult: false,
    languages: [],
    lastAirDate: '',
    numberOfAiredEpisodes: 0,
    numberOfEpisodes: 0,
    numberOfSeasons: 0,
    originalLanguage: 'en',
    originalTitle: title,
    popularity,
    posterImage: `${POSTER}${posterPath}`,
    posterPath,
    releaseYear: year,
    slug,
    status: 'Ended',
    tagline: '',
    title,
    type: 'Scripted',
    voteAverage: 0,
    voteCount: 0,
  };
}

function person(
  id: number,
  name: string,
  slug: string,
  department: string,
  knownFor: ReadonlyArray<string>,
  profilePath: string,
): SearchPerson {
  return {
    id,
    image: `${PROFILE}${profilePath}`,
    knownFor,
    knownForDepartment: department,
    name,
    slug,
  };
}

const BREAKING_BAD = show(
  1396,
  'Breaking Bad',
  'breaking-bad',
  '2008',
  '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  310,
);
const THE_BEAR = show(
  136315,
  'The Bear',
  'the-bear',
  '2022',
  '/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg',
  140,
);

const BRYAN_CRANSTON = person(
  17419,
  'Bryan Cranston',
  'bryan-cranston',
  'Acting',
  ['Breaking Bad', 'Isle of Dogs'],
  '/7Jahy5LZX2Fo8fGJltMreAI49hC.jpg',
);

/** “bre”: TMDB lists Breaking Bad fifth; the ranking puts it first */
const BRE: SearchResults = {
  best: 'series',
  people: [],
  series: [
    BREAKING_BAD,
    show(
      105521,
      'Breathe: Into the Shadows',
      'breathe-into-the-shadows',
      '2020',
      '/owTpRRYKO4VIuJWTKBSM1oCHF2T.jpg',
      14,
    ),
    show(60715, 'Bref', 'bref', '2011', '/ddCxr3JOEh8tTebrHlXv31wY37r.jpg', 6),
    show(
      11989,
      'Bret Maverick',
      'bret-maverick',
      '1981',
      '/27bbSKy9tWe7VG5k1gekL6oRb4B.jpg',
      3,
    ),
    show(
      2288,
      'Prison Break',
      'prison-break',
      '2005',
      '/wnmNPaLvhnMeOqnWlhNkYCZxtda.jpg',
      92,
    ),
    show(
      128839,
      'La Brea',
      'la-brea',
      '2021',
      '/wEo5pzSZ3MF4EzNvY2R1OZNX266.jpg',
      38,
    ),
    show(
      223500,
      'Wind Breaker',
      'wind-breaker',
      '2024',
      '/h9IHHVR6piicaaWOgNLSsvRSC3r.jpg',
      31,
    ),
  ],
};

/** “breaking”: the show, and the people known for it */
const BREAKING: SearchResults = {
  best: 'series',
  people: [BRYAN_CRANSTON],
  series: [BREAKING_BAD],
};

/** “bryan”: a person is the best match, so People comes first */
const BRYAN: SearchResults = {
  best: 'people',
  people: [
    BRYAN_CRANSTON,
    person(
      29092,
      'Bryan Brown',
      'bryan-brown',
      'Acting',
      ['Cocktail', 'F/X'],
      '/x0NqVqpJSET0oVdJxbbwwd7hrFA.jpg',
    ),
    person(
      17311,
      'Bryan Fuller',
      'bryan-fuller',
      'Writing',
      ['Hannibal', 'Heroes'],
      '/yeGxbuZ1Wzv8qhTDkdrIQfxKGkW.jpg',
    ),
  ],
  series: [
    show(
      76595,
      'Bryan Inc.',
      'bryan-inc',
      '2016',
      '/hTw2ph646aFb9lfWeGWJCNy6yZD.jpg',
      2,
    ),
    show(
      236732,
      'Bryan’s All In',
      'bryans-all-in',
      '2023',
      '/k6Nd8DBzXak9lfECgIM9GHH8Jw.jpg',
      1,
    ),
    show(
      88696,
      'Island of Bryan',
      'island-of-bryan',
      '2019',
      '/lXkbYZVqcNd614ahhoGVwEIe10H.jpg',
      4,
    ),
    show(
      59298,
      'House of Bryan',
      'house-of-bryan',
      '2010',
      '/sRmj3vqU1r8wpregVAFgX8e933e.jpg',
      3,
    ),
    show(
      44182,
      'Leave It to Bryan',
      'leave-it-to-bryan',
      '2012',
      '/uxOfEGU1npp1xpyMW1ONGERAW9Z.jpg',
      2,
    ),
  ],
};

/** “bryan cranston”: exact name; the two people without a photo are dropped */
const BRYAN_CRANSTON_ONLY: SearchResults = {
  best: 'people',
  people: [BRYAN_CRANSTON],
  series: [],
};

/** “the bear”: the exact title is marked; Bart the Bear sits in People */
const THE_BEAR_RESULTS: SearchResults = {
  best: 'series',
  people: [
    person(
      2658100,
      'Bart the Bear',
      'bart-the-bear',
      'Acting',
      ['The Bear', 'Twelve Monkeys'],
      '/1Pd4UodHktlflqCBfsB94Fmhro5.jpg',
    ),
  ],
  series: [
    THE_BEAR,
    show(
      46080,
      'Masha and the Bear',
      'masha-and-the-bear',
      '2009',
      '/wPkeRunw71Mm10xQYKAwGG0NLgt.jpg',
      58,
    ),
    show(
      207,
      'Bear in the Big Blue House',
      'bear-in-the-big-blue-house',
      '1997',
      '/hww73tErgeSOQ6YlcKjey0smc8s.jpg',
      12,
    ),
    show(
      30773,
      'The Yogi Bear Show',
      'the-yogi-bear-show',
      '1961',
      '/alDnwQ75JZu3V3aoa4F5w7LoyL7.jpg',
      9,
    ),
    show(
      961,
      'B. J. and the Bear',
      'b-j-and-the-bear',
      '1979',
      '/pFYowtsK6oYOZySPnNXf4TlIoBT.jpg',
      7,
    ),
    show(
      302118,
      'I Kill the Bear',
      'i-kill-the-bear',
      '2026',
      '/5EJycujPz6S8kkGowVzNfde2CQU.jpg',
      5,
    ),
    show(
      11732,
      'The Adventures of Paddington Bear',
      'the-adventures-of-paddington-bear',
      '1997',
      '/dDERiKarYbrC9mYymXMoKibSNLA.jpg',
      5,
    ),
  ],
};

/** “brian cox”: two Brian Coxes, known-for tells them apart */
const BRIAN_COX: SearchResults = {
  best: 'people',
  people: [
    person(
      1248,
      'Brian Cox',
      'brian-cox',
      'Acting',
      ['Troy', 'The Bourne Supremacy'],
      '/scSjbFCTRngXlkJRoKptM5kQGw7.jpg',
    ),
    person(
      224290,
      'Brian Cox',
      'brian-cox',
      'Acting',
      ['Wonders of the Solar System', 'Wonders of the Universe'],
      '/98WBXqXKoOKbXi3rjupcp1vz17F.jpg',
    ),
    person(
      1296991,
      'Brian Cox',
      'brian-cox',
      'Production',
      ['Remember', 'Pulse'],
      '/iUoLmWWKLvgJ7rneE9ORJg8RRTg.jpg',
    ),
  ],
  // ranked as the API does: “Brian Cox: …” titles (starts with) before
  // “… with Brian Cox” (a later word), then popularity
  series: [
    show(
      70726,
      'Brian Cox: Life of a Universe',
      'brian-cox-life-of-a-universe',
      '2017',
      '/kzD9FAuLpTodatDYcPZmMTwHgIw.jpg',
      2,
    ),
    show(
      214676,
      'Brian Cox: How the Other Half Live',
      'brian-cox-how-the-other-half-live',
      '2022',
      '/2UMB1PtWF6OjAXjsoOZz5Lt1vkP.jpg',
      2,
    ),
    show(
      66914,
      'Forces of Nature with Brian Cox',
      'forces-of-nature-with-brian-cox',
      '2016',
      '/9w32RQWnnuoDRsdPg8th7WwYaiG.jpg',
      3,
    ),
    show(
      240547,
      'Made of Money with Brian Cox',
      'made-of-money-with-brian-cox',
      '2023',
      '/4drOWMCttGdkPIkEbFcPHN8WNei.jpg',
      1,
    ),
  ],
};

const NOTHING: SearchResults = { best: null, people: [], series: [] };

/**
 * Exact queries first; a shorter prefix answers like the first query it
 * starts (typing “br” on the way to “bre”, “bryan c” to “bryan cranston”).
 */
const ANSWERS: ReadonlyArray<readonly [string, SearchResults]> = [
  ['bre', BRE],
  ['bryan', BRYAN],
  ['breaking', BREAKING],
  ['brian cox', BRIAN_COX],
  ['the bear', THE_BEAR_RESULTS],
  ['bryan cranston', BRYAN_CRANSTON_ONLY],
];

const SLOW: Readonly<Record<string, number>> = { 'bryan cranston': 1200 };

function answer(q: string): SearchResults {
  const exact = ANSWERS.find(([key]) => key === q);
  if (exact) {
    return exact[1];
  }
  const prefix = ANSWERS.find(([key]) => q.length >= 2 && key.startsWith(q));
  return prefix?.[1] ?? NOTHING;
}

export const routes: readonly StubRoute[] = [
  {
    handle: async ({ query }) => {
      const q = query.get('q') ?? '';
      if (!q.trim() || q.length > 100) {
        return { body: { message: 'Invalid query' }, status: 400 };
      }
      if (q === 'server error') {
        return { body: { message: 'Internal Server Error' }, status: 500 };
      }
      const delay = SLOW[q] ?? 0;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return { body: answer(q) };
    },
    path: '/search',
  },
];
