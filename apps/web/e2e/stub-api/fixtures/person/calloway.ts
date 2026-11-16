import {
  buildCareer,
  buildShows,
  buildWatched,
  type Credit,
  type StubPerson,
} from './build.ts';

/**
 * Wren Calloway (invented, id 4242001): the sparse person. No photo,
 * biography, dates or links; two guest roles; nothing from Wikidata.
 */

const credits: ReadonlyArray<Credit> = [
  {
    characters: ['Nurse Ada'],
    episodes: 1,
    id: 9700001,
    name: 'Harbor Lights',
    year: 2021,
  },
  {
    characters: ['Customer'],
    episodes: 1,
    id: 9700002,
    name: 'The Long Weekend',
    year: 2019,
  },
  // One dated premiere, so "Premieres Jun 12" has a fixture
  {
    characters: ['Dr. Maren Voss'],
    episodes: 0,
    id: 9700003,
    name: 'Harbor Lights: Season Two',
    upcoming: '2027-06-12',
  },
];

const shows = buildShows(credits);

export const calloway: StubPerson = {
  career: buildCareer(shows, []),
  collaborators: { collaborators: [] },
  familyAndAwards: { awards: null, family: null },
  knownFor: [],
  links: { links: [] },
  person: {
    character: '',
    gender: 'female',
    id: 4242001,
    image: '',
    job: '',
    knownForDepartment: 'Acting',
    name: 'Wren Calloway',
    numberOfEpisodes: 0,
    slug: 'wren-calloway',
  },
  shows,
  watched: buildWatched(shows, []),
};
