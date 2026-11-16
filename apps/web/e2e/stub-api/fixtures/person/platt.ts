import {
  buildCareer,
  buildShows,
  buildWatched,
  type Credit,
  type StubPerson,
} from './build.ts';

/**
 * Oliver Platt (TMDB 17485), a guest face in The Bear's S01E02: the person
 * the episode modal's faces open (its links carry no slug, so the page
 * redirects to `/person/17485/oliver-platt` in the stream). Sparse: one
 * credit, no biography or links.
 */

const credits: ReadonlyArray<Credit> = [
  {
    characters: ["Uncle Jimmy 'Cicero' Kalinowski"],
    episodes: 12,
    id: 136315,
    name: 'The Bear',
    year: 2022,
  },
];

const shows = buildShows(credits);

export const platt: StubPerson = {
  career: buildCareer(shows, []),
  collaborators: { collaborators: [] },
  familyAndAwards: { awards: null, family: null },
  knownFor: [],
  links: { links: [] },
  person: {
    character: '',
    gender: 'male',
    id: 17485,
    image: '',
    job: '',
    knownForDepartment: 'Acting',
    name: 'Oliver Platt',
    numberOfEpisodes: 0,
    slug: 'oliver-platt',
  },
  shows,
  watched: buildWatched(shows, []),
};
