import type { CrewCredit } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  countPeople,
  crewLabel,
  crewSectionOf,
  faceLabel,
  peopleCount,
  stackLine,
  toCastAndCrew,
  toCastStack,
  toCrewSections,
} from './castAndCrew';

const credit = (id: number, name: string, character = '') => ({
  character,
  id,
  image: `${id}.jpg`,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
});

const STORER = credit(1, 'Christopher Storer');
const WHITE = credit(2, 'Jeremy Allen White', 'Carmy Berzatto');
const EDEBIRI = credit(3, 'Ayo Edebiri', 'Sydney Adamu');

const crewRow = (
  id: number,
  name: string,
  department: string,
  jobs: ReadonlyArray<readonly [string, number]>,
  numberOfEpisodes = 0,
): CrewCredit => ({
  department,
  id,
  image: '',
  jobs: jobs.map(([job, episodes]) => ({ episodes, job })),
  name,
  numberOfEpisodes,
  slug: name.toLowerCase().replace(/ /g, '-'),
});

const sectionsOf = (sections: ReturnType<typeof toCrewSections>) =>
  sections.map(({ people, title }) => [
    title,
    people.map((person) => `${person.name}: ${person.role}`),
  ]);

describe('toCastAndCrew', () => {
  it('splits the cast, with their characters, from the creators', () => {
    expect(toCastAndCrew([STORER], [WHITE, EDEBIRI], [])).toEqual({
      cast: [
        {
          id: 2,
          image: '2.jpg',
          name: 'Jeremy Allen White',
          role: 'Carmy Berzatto',
          slug: 'jeremy-allen-white',
        },
        {
          id: 3,
          image: '3.jpg',
          name: 'Ayo Edebiri',
          role: 'Sydney Adamu',
          slug: 'ayo-edebiri',
        },
      ],
      crew: [
        {
          people: [
            {
              id: 1,
              image: '1.jpg',
              name: 'Christopher Storer',
              role: 'Creator',
              slug: 'christopher-storer',
            },
          ],
          title: 'Created by',
        },
      ],
    });
  });

  it('lists a creator who also acts in both', () => {
    const acting = credit(1, 'Christopher Storer', 'Himself');
    const { cast, crew } = toCastAndCrew([STORER], [acting, WHITE], []);

    expect(cast.map((person) => [person.id, person.role])).toEqual([
      [1, 'Himself'],
      [2, 'Carmy Berzatto'],
    ]);
    expect(sectionsOf(crew)).toEqual([
      ['Created by', ['Christopher Storer: Creator']],
    ]);
  });

  it('has no crew sections without a crew, and an empty cast without a cast', () => {
    expect(toCastAndCrew([], [WHITE], []).crew).toEqual([]);
    expect(toCastAndCrew([STORER], [], []).cast).toEqual([]);
  });
});

describe('crewSectionOf', () => {
  it.each([
    ['Directing', 'Director', 'Directed by'],
    ['Writing', 'Writer', 'Written by'],
    ['Production', 'Executive Producer', 'Produced by'],
    ['Production', 'Casting', 'Casting'],
    ['Production', 'Casting Director', 'Casting'],
    ['Production', 'Casting Associate', 'Casting'],
    ['Sound', 'Original Music Composer', 'Music by'],
    ['Sound', 'Music', 'Music by'],
    ['Sound', 'Theme Song Performance', 'Music by'],
    ['Sound', 'Music Supervisor', 'Music by'],
    ['Sound', 'Sound Re-Recording Mixer', 'Sound'],
    ['Camera', 'Director of Photography', 'Cinematography'],
    ['Camera', 'Cinematography', 'Cinematography'],
    ['Camera', 'Steadicam Operator', 'Camera'],
    ['Editing', 'Editor', 'Editing'],
    ['Art', 'Production Design', 'Art'],
    ['Costume & Make-Up', 'Costume Designer', 'Costume & make-up'],
    ['Visual Effects', 'VFX Supervisor', 'Visual effects'],
    ['Lighting', 'Gaffer', 'Lighting'],
    ['Crew', 'Stunt Coordinator', 'Crew'],
    ['Actors', 'Stunt Double', 'Crew'],
    ['', 'Driver', 'Crew'],
  ])('puts %s’s “%s” in %s', (department, job, section) => {
    expect(crewSectionOf(department, job)).toBe(section);
  });
});

describe('toCrewSections', () => {
  it('follows IMDb’s order and leaves empty sections out', () => {
    const crew = [
      crewRow(10, 'Gaffer Gill', 'Lighting', [['Gaffer', 4]]),
      crewRow(11, 'Joanna Calo', 'Directing', [['Director', 3]]),
      crewRow(12, 'Ruby Casting', 'Production', [['Casting', 18]]),
      crewRow(13, 'Odd Job', 'Mystery', [['Wrangler', 1]]),
    ];

    expect(
      toCrewSections([STORER], crew).map((section) => section.title),
    ).toEqual(['Created by', 'Directed by', 'Casting', 'Lighting', 'Crew']);
  });

  it('sorts by episodes, busiest first, then by name, and keeps the creators’ order', () => {
    const creators = [credit(2, 'Zed Creator'), credit(3, 'Abe Creator')];
    const crew = [
      crewRow(20, 'Bea', 'Directing', [['Director', 2]]),
      crewRow(21, 'Ann', 'Directing', [['Director', 2]]),
      crewRow(22, 'Cal', 'Directing', [['Director', 9]]),
    ];

    expect(sectionsOf(toCrewSections(creators, crew))).toEqual([
      ['Created by', ['Zed Creator: Creator', 'Abe Creator: Creator']],
      [
        'Directed by',
        [
          'Cal: Director · 9 episodes',
          'Ann: Director · 2 episodes',
          'Bea: Director · 2 episodes',
        ],
      ],
    ]);
  });

  it('lists someone once per section, their jobs joined, busiest first', () => {
    const crew = [
      crewRow(
        30,
        'Christopher Storer',
        'Production',
        [
          ['Producer', 4],
          ['Executive Producer', 28],
        ],
        28,
      ),
    ];

    expect(sectionsOf(toCrewSections([], crew))).toEqual([
      [
        'Produced by',
        ['Christopher Storer: Executive Producer, Producer · 28 episodes'],
      ],
    ]);
  });

  it('puts someone in each section they worked in, a creator who directs too', () => {
    const crew = [
      crewRow(1, 'Christopher Storer', 'Directing', [['Director', 12]], 12),
      crewRow(1, 'Christopher Storer', 'Writing', [['Writer', 1]], 1),
    ];

    expect(sectionsOf(toCrewSections([STORER], crew))).toEqual([
      ['Created by', ['Christopher Storer: Creator']],
      ['Directed by', ['Christopher Storer: Director · 12 episodes']],
      ['Written by', ['Christopher Storer: Writer · 1 episode']],
    ]);
  });

  it('splits a department’s row by job, each section counting its own episodes', () => {
    const crew = [
      crewRow(
        40,
        'Matt Pheasant',
        'Production',
        [
          ['Executive Producer', 10],
          ['Casting Director', 6],
        ],
        14,
      ),
    ];

    expect(sectionsOf(toCrewSections([], crew))).toEqual([
      ['Produced by', ['Matt Pheasant: Executive Producer · 10 episodes']],
      ['Casting', ['Matt Pheasant: Casting Director · 6 episodes']],
    ]);
  });

  it('takes the total for a row whole in one section, never a sum of its jobs', () => {
    const crew = [
      crewRow(
        50,
        'Sam Dir',
        'Directing',
        [
          ['Director', 8],
          ['Second Unit Director', 8],
        ],
        8,
      ),
    ];

    expect(sectionsOf(toCrewSections([], crew))).toEqual([
      ['Directed by', ['Sam Dir: Director, Second Unit Director · 8 episodes']],
    ]);
  });

  it('keeps crew without a photo, and leaves the episodes out when unknown', () => {
    const crew = [
      crewRow(60, 'No Count', 'Crew', [['Driver', 0]]),
      crewRow(61, 'No Job', 'Crew', []),
    ];
    const [section] = toCrewSections([], crew);

    expect(section?.people).toEqual([
      {
        id: 60,
        image: '',
        name: 'No Count',
        role: 'Driver',
        slug: 'no-count',
      },
      { id: 61, image: '', name: 'No Job', role: '', slug: 'no-job' },
    ]);
  });
});

describe('countPeople', () => {
  it('counts someone with several roles once, across the cast and the crew', () => {
    const acting = credit(1, 'Christopher Storer', 'Himself');
    const crew = [
      crewRow(1, 'Christopher Storer', 'Directing', []),
      crewRow(9, 'Joanna Calo', 'Directing', []),
      crewRow(9, 'Joanna Calo', 'Writing', []),
    ];

    expect(countPeople([STORER], [acting, WHITE, EDEBIRI], crew)).toBe(4);
    expect(countPeople([STORER], [WHITE, EDEBIRI], [])).toBe(3);
    expect(countPeople([], [], [])).toBe(0);
  });
});

describe('toCastStack', () => {
  it('takes the first five of the cast with a photo, never a blank face', () => {
    const cast = Array.from({ length: 8 }, (_, index) =>
      credit(index + 10, `Actor ${index}`, `Role ${index}`),
    );
    const blank = { ...credit(5, 'No Photo', 'Extra'), image: '' };

    const withBlank = [...cast.slice(0, 1), blank, ...cast.slice(1)];

    expect(toCastStack(withBlank).map((person) => person.id)).toEqual([
      10, 11, 12, 13, 14,
    ]);
  });
});

describe('stackLine', () => {
  it('names the first two of the cast and counts the rest of the cast', () => {
    expect(stackLine([WHITE, EDEBIRI], 21)).toEqual({
      first: 'Jeremy Allen White',
      rest: ', Ayo Edebiri and 19 more',
    });
  });

  it('joins exactly two with "and", never "and 0 more"', () => {
    expect(stackLine([WHITE, EDEBIRI], 2)).toEqual({
      first: 'Jeremy Allen White',
      rest: ' and Ayo Edebiri',
    });
  });

  it('names one alone', () => {
    expect(stackLine([WHITE], 1)).toEqual({
      first: 'Jeremy Allen White',
      rest: '',
    });
  });
});

describe('faceLabel and crewLabel', () => {
  it('names the character, or the person alone', () => {
    const [white, nameless] = toCastAndCrew(
      [],
      [WHITE, credit(4, 'Extra')],
      [],
    ).cast;

    expect(white && faceLabel(white)).toBe(
      'Jeremy Allen White as Carmy Berzatto',
    );
    expect(nameless && faceLabel(nameless)).toBe('Extra');
  });

  it('names the creator, the crew’s jobs, or the person alone', () => {
    const crew = [
      crewRow(11, 'Joanna Calo', 'Directing', [['Director', 3]]),
      crewRow(12, 'No Job', 'Crew', []),
    ];
    const people = toCrewSections([STORER], crew).flatMap(
      (section) => section.people,
    );

    expect(people.map(crewLabel)).toEqual([
      'Christopher Storer, creator',
      'Joanna Calo, Director · 3 episodes',
      'No Job',
    ]);
  });
});

describe('peopleCount', () => {
  it('counts one person, and groups thousands', () => {
    expect(peopleCount(1)).toBe('1 person');
    expect(peopleCount(21)).toBe('21 people');
    expect(peopleCount(1204)).toBe('1,204 people');
  });
});
