import type { SearchView } from './searchView';

const poster = (path: string) =>
  `https://image.tmdb.org/t/p/w300_and_h450_bestv2${path}`;
const face = (path: string) =>
  `https://image.tmdb.org/t/p/w600_and_h900_bestv2${path}`;

const show = (id: number, title: string, slug: string, year: string) => ({
  id,
  posterImage: poster(`/${slug}.jpg`),
  releaseYear: year,
  slug,
  title,
});

/** “bre”: shows only, Breaking Bad first (the API's ranking) */
export const BRE: SearchView = {
  best: 'series',
  people: [],
  series: [
    show(1396, 'Breaking Bad', 'breaking-bad', '2008'),
    show(
      105521,
      'Breathe: Into the Shadows',
      'breathe-into-the-shadows',
      '2020',
    ),
    show(60715, 'Bref', 'bref', '2011'),
    show(11989, 'Bret Maverick', 'bret-maverick', '1981'),
    show(2288, 'Prison Break', 'prison-break', '2005'),
    show(128839, 'La Brea', 'la-brea', '2021'),
    show(223500, 'Wind Breaker', 'wind-breaker', '2024'),
    show(46080, 'Masha and the Bear', 'masha-and-the-bear', '2009'),
    show(30773, 'The Yogi Bear Show', 'the-yogi-bear-show', '1961'),
  ],
};

/** “bryan”: a person is the best match */
export const BRYAN: SearchView = {
  best: 'people',
  people: [
    {
      id: 17419,
      image: face('/bryan-cranston.jpg'),
      knownFor: ['Breaking Bad', 'Isle of Dogs'],
      knownForDepartment: 'Acting',
      name: 'Bryan Cranston',
      slug: 'bryan-cranston',
    },
    {
      id: 29092,
      image: face('/bryan-brown.jpg'),
      knownFor: ['Cocktail', 'F/X'],
      knownForDepartment: 'Acting',
      name: 'Bryan Brown',
      slug: 'bryan-brown',
    },
    {
      id: 17311,
      image: face('/bryan-fuller.jpg'),
      knownFor: ['Hannibal', 'Heroes'],
      knownForDepartment: 'Writing',
      name: 'Bryan Fuller',
      slug: 'bryan-fuller',
    },
  ],
  series: [
    show(76595, 'Bryan Inc.', 'bryan-inc', '2016'),
    show(236732, 'Bryan’s All In', 'bryans-all-in', '2023'),
    show(88696, 'Island of Bryan', 'island-of-bryan', '2019'),
    show(59298, 'House of Bryan', 'house-of-bryan', '2010'),
    show(44182, 'Leave It to Bryan', 'leave-it-to-bryan', '2012'),
  ],
};

export const NOTHING: SearchView = { best: null, people: [], series: [] };
