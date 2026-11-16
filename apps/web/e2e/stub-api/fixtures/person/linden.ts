import {
  buildCareer,
  buildShows,
  buildWatched,
  type Credit,
  type StubPerson,
} from './build.ts';

/**
 * Mara Linden (invented, id 4242003): the family block at its most common
 * count. A spouse, children and upcoming work, no headline award: three
 * lines on desktop, two below lg (the "Next" line is desktop only).
 */

const credits: ReadonlyArray<Credit> = [
  {
    characters: ['Ilse Brandt'],
    episodes: 24,
    id: 9700101,
    name: 'Cold Harbour',
    year: 2019,
  },
  {
    characters: ['Detective Rowe'],
    episodes: 3,
    id: 9700102,
    name: 'Night Ferry',
    year: 2022,
  },
  {
    characters: ['Agnes'],
    episodes: 0,
    id: 9700103,
    name: 'The Glass Orchard',
    upcoming: 'in-development',
  },
];

const shows = buildShows(credits);

export const linden: StubPerson = {
  career: buildCareer(shows, []),
  collaborators: { collaborators: [] },
  familyAndAwards: {
    awards: null,
    family: {
      children: [
        { id: 'Q9900101', name: 'Ola Linden', relation: 'daughter' },
        { id: 'Q9900102', name: 'Bo Linden', relation: 'son' },
      ],
      spouses: [{ id: 'Q9900103', name: 'Teo Marsh', startYear: 2011 }],
    },
  },
  knownFor: [],
  links: { links: [] },
  person: {
    character: '',
    gender: 'female',
    id: 4242003,
    image: '',
    job: '',
    knownForDepartment: 'Acting',
    name: 'Mara Linden',
    numberOfEpisodes: 0,
    slug: 'mara-linden',
  },
  shows,
  watched: buildWatched(shows, []),
};
