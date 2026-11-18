import {
  awardItems,
  buildAwards,
  buildCareer,
  buildShows,
  buildWatched,
  type ChartSpan,
  type Credit,
  knownForMovie,
  knownForSeries,
  PROFILE,
  type StubPerson,
} from './build.ts';

/**
 * Lance Reddick (TMDB 129101): deceased (2023-03-17), no upcoming work, work
 * released after his death; the one-off roles and collaborators are
 * illustrative. Ids are real TMDB ids where known, else 9500001 and up.
 */

const series: ReadonlyArray<Credit> = [
  {
    characters: ['Two roles'],
    episodes: 11,
    id: 9500001,
    name: 'Oz',
    year: 2000,
  },
  {
    characters: ['Cedric Daniels'],
    episodes: 60,
    id: 1438,
    name: 'The Wire',
    poster: '/pr_dec_p_wire.jpg',
    year: 2002,
  },
  {
    characters: ['Matthew Abaddon'],
    episodes: 4,
    id: 4607,
    name: 'Lost',
    year: 2008,
  },
  {
    characters: ['Phillip Broyles'],
    episodes: 90,
    id: 1705,
    name: 'Fringe',
    poster: '/pr_dec_p_fringe.jpg',
    year: 2008,
  },
  {
    characters: ['DCI Jeffrey Tetazoo'],
    episodes: 5,
    id: 9500002,
    name: 'Intelligence',
    year: 2014,
  },
  {
    characters: ['Irvin Irving'],
    episodes: 68,
    id: 9500003,
    name: 'Bosch',
    poster: '/pr_dec_p_bosch.jpg',
    year: 2014,
  },
  {
    characters: ['Christian DeVille'],
    episodes: 18,
    id: 9500004,
    name: 'Corporate',
    year: 2018,
  },
  {
    characters: ['Albert Wesker'],
    episodes: 8,
    id: 9500005,
    name: 'Resident Evil',
    poster: '/pr_dec_p_residentevil.jpg',
    year: 2022,
  },
  {
    characters: ['Renzo (voice)'],
    episodes: 10,
    id: 9500006,
    name: 'Farzar',
    year: 2022,
  },
  {
    characters: ['Thordak (voice)'],
    date: '2023-01-20',
    episodes: 9,
    id: 9500007,
    name: 'The Legend of Vox Machina',
    year: 2023,
  },
  // Released after his death
  {
    characters: ['Irvin Irving'],
    date: '2023-10-20',
    episodes: 1,
    id: 9500008,
    name: 'Bosch: Legacy',
    year: 2023,
  },
  {
    characters: ['Zeus'],
    date: '2024-01-30',
    episodes: 1,
    id: 9500009,
    name: 'Percy Jackson and the Olympians',
    year: 2024,
  },
  {
    characters: ['Lex Luthor (voice)'],
    date: '2024-03-14',
    episodes: 4,
    id: 9500010,
    name: 'Kite Man: Hell Yeah!',
    year: 2024,
  },
];

/** 26 one-off roles, 1996 to 2022. */
const guests: ReadonlyArray<Credit> = [
  [9500101, 'Law & Order', 'Reverend Cole', 1996],
  [9500102, 'New York Undercover', 'Detective Hayes', 1996],
  [9500103, 'Spin City', 'Delivery Man', 1997],
  [9500104, 'The Practice', 'Judge Warren', 1997],
  [9500105, 'Cosby', 'Doctor', 1999],
  [9500106, 'The Corner', 'Deacon Barnes', 2000],
  [9500107, 'The Sopranos', 'Security Guard', 2001],
  [9500108, 'Law & Order: Special Victims Unit', 'Dr. Ames', 2002],
  [9500109, 'Third Watch', 'Captain Rowe', 2003],
  [9500110, 'Numb3rs', 'Agent Lyle', 2004],
  [9500111, 'CSI: NY', 'Lt. Carver', 2005],
  [9500112, 'Law & Order: Criminal Intent', 'Mr. Thorne', 2005],
  [9500113, 'Medium', 'Warden Pryce', 2007],
  [9500114, 'Castle', 'Commander Boyd', 2011],
  [9500115, 'Archer', 'Agent Spence (voice)', 2013],
  [9500116, 'Workaholics', 'Principal Nash', 2014],
  [9500117, 'Elementary', 'Dr. Voss', 2014],
  [9500118, 'Royal Pains', 'Mr. Kline', 2014],
  [9500119, 'Chozen', 'Phil (voice)', 2014],
  [9500120, 'Rick and Morty', 'Space Cop (voice)', 2015],
  [9500121, 'Comrade Detective', 'Narrator', 2015],
  [9500122, 'Lucifer', 'Dr. Ford', 2016],
  [9500123, 'Sneaky Pete', 'Walter', 2017],
  [9500124, 'Strike Back', 'General Banks', 2020],
  [9500125, 'Bob’s Burgers', 'Officer Daniels (voice)', 2021],
  [9500126, 'The Boys Presents: Diabolical', 'Barry (voice)', 2022],
].map(([id, name, character, year]) => ({
  characters: [character as string],
  episodes: 1,
  id: id as number,
  name: name as string,
  year: year as number,
}));

const shows = buildShows([...series, ...guests]);

const chart: ReadonlyArray<ChartSpan> = [
  { endYear: 2001, id: 9500001 },
  { endYear: 2008, id: 1438 },
  { endYear: 2010, id: 4607 },
  { endYear: 2013, id: 1705 },
  { endYear: 2014, id: 9500002 },
  {
    endYear: 2020,
    id: 9500003,
    years: [2014, 2015, 2016, 2017, 2018, 2019, 2020],
  },
  { endYear: 2020, id: 9500004 },
  { endYear: 2022, id: 9500005 },
  { endYear: 2022, id: 9500006 },
  { endYear: 2023, id: 9500007, years: [2023] },
  { endYear: 2023, id: 9500008 },
  { endYear: 2024, id: 9500009 },
  { endYear: 2024, id: 9500010 },
];

const collaborator = (
  id: number,
  name: string,
  role: string,
  episodeCount: number,
  showIds: ReadonlyArray<number>,
) => ({
  count: showIds.length,
  episodeCount,
  id,
  image: '',
  name,
  role,
  showIds,
  slug: name.toLowerCase().replaceAll(' ', '-'),
});

export const reddick: StubPerson = {
  career: buildCareer(shows, chart),
  collaborators: {
    collaborators: [
      collaborator(9600001, 'Titus Welliver', 'Actor', 69, [9500003, 9500008]),
      collaborator(9600002, 'Jamie Hector', 'Actor', 68, [1438, 9500003]),
      collaborator(9600003, 'Wendell Pierce', 'Actor', 62, [1438, 9500003]),
      collaborator(
        9600004,
        'Michael Connelly',
        'Executive Producer',
        69,
        [9500003, 9500008],
      ),
    ],
  },
  familyAndAwards: {
    awards: buildAwards(
      awardItems([
        {
          awards: [
            'Children’s and Family Emmy Award for Outstanding Supporting Performer',
          ],
          group: 'Emmy',
          lastYear: 2025,
          total: 1,
          wins: 0,
          works: ['Percy Jackson and the Olympians'],
        },
      ]),
    ),
    family: null,
  },
  knownFor: [
    knownForSeries({
      id: 1438,
      poster: '/pr_dec_p_wire.jpg',
      title: 'The Wire',
      year: 2002,
    }),
    knownForSeries({
      id: 1705,
      poster: '/pr_dec_p_fringe.jpg',
      title: 'Fringe',
      year: 2008,
    }),
    knownForSeries({
      id: 9500003,
      poster: '/pr_dec_p_bosch.jpg',
      title: 'Bosch',
      year: 2014,
    }),
    knownForSeries({
      id: 9500005,
      poster: '/pr_dec_p_residentevil.jpg',
      title: 'Resident Evil',
      year: 2022,
    }),
    knownForMovie({
      id: 245891,
      poster: '/pr_dec_p_johnwick.jpg',
      releaseDate: '2014-10-24',
      title: 'John Wick',
      year: 2014,
    }),
  ],
  links: {
    links: [
      {
        id: 'nm0714979',
        type: 'imdb',
        url: 'https://www.imdb.com/name/nm0714979/',
      },
    ],
  },
  person: {
    age: 60,
    biography:
      'Lance Solomon Reddick (June 7, 1962 – March 17, 2023) was an American actor. He portrayed Cedric Daniels in The Wire (2002–2008), Phillip Broyles in Fringe (2008–2013), and Chief Irvin Irving in Bosch (2014–2020). In film, he played Charon in the John Wick franchise (2014–2025) and General Caulfield in White House Down (2013). He also portrayed Detective Johnny Basil in the fourth season of Oz (2000–01), Matthew Abaddon in Lost (2004–10), Albert Wesker and his clones in the Netflix series Resident Evil (2022), and Zeus in Percy Jackson and the Olympians (2024), the latter released posthumously and earned him a Children’s and Family Emmy Award for Outstanding Supporting Performer nomination.',
    birthdate: '1962-06-07',
    character: '',
    deathdate: '2023-03-17',
    gender: 'male',
    id: 129101,
    image: `${PROFILE}/pr_dec_profile.jpg`,
    imdbId: 'nm0714979',
    isAdult: false,
    job: '',
    knownForDepartment: 'Acting',
    name: 'Lance Reddick',
    numberOfEpisodes: 0,
    placeOfBirth: 'Baltimore, Maryland, USA',
    slug: 'lance-reddick',
  },
  shows,
  watched: buildWatched(shows, [
    { seriesId: 1438, watched: 60 },
    { seriesId: 9500003, watched: 30 },
    { seriesId: 9500009, watched: 1 },
  ]),
};
