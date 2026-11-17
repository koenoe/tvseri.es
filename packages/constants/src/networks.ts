/**
 * Networks that have a landing (`/network/{slug}`): the TMDB network id and one
 * line about the network, shown in the landing's hero.
 *
 * Ids are the main TMDB entry of each network (TMDB has regional duplicates).
 */
type NetworkEntry = Readonly<{
  slug: string;
  id: number;
  /** TMDB's name for the network */
  name: string;
  /** the landing hero's line */
  description: string;
  /** a shorter line for phones, where the hero's is too long */
  phoneDescription?: string;
  /**
   * The hero's "Since 1972" (the network's start,
   * or `originals` for "Originals since 2012"); without it the page uses
   * the year of the network's first show on TMDB.
   */
  since?: Readonly<{ year: number; originals?: true }>;
}>;

export const NETWORKS: ReadonlyArray<NetworkEntry> = [
  {
    description:
      'Prestige drama since The Sopranos. Most of its series are finished stories you can start from the beginning.',
    id: 49,
    name: 'HBO',
    phoneDescription: 'Prestige drama since The Sopranos.',
    since: { year: 1972 },
    slug: 'hbo',
  },
  {
    description:
      'Its own series and other networks’ series side by side. The Originals / Also on Netflix switch keeps them apart.',
    id: 213,
    name: 'Netflix',
    since: { originals: true, year: 2012 },
    slug: 'netflix',
  },
  {
    description:
      'Only originals, almost all still running. A young network: its page is about what is on and what is next.',
    id: 2552,
    name: 'Apple TV',
    since: { year: 2019 },
    slug: 'apple-tv',
  },
  {
    description:
      "Amazon's streaming service, home to The Boys and The Marvelous Mrs. Maisel.",
    id: 1024,
    name: 'Prime Video',
    slug: 'prime-video',
  },
  {
    description:
      "Disney's streaming service, launched in 2019, home to Marvel, Star Wars and Pixar.",
    id: 2739,
    name: 'Disney+',
    slug: 'disney-plus',
  },
  {
    description:
      "American streaming service, home to The Handmaid's Tale and Only Murders in the Building.",
    id: 453,
    name: 'Hulu',
    slug: 'hulu',
  },
  {
    description:
      "Paramount's streaming service, home to Star Trek and the Yellowstone prequels.",
    id: 4330,
    name: 'Paramount+',
    slug: 'paramount-plus',
  },
  {
    description: "NBCUniversal's streaming service, launched in 2020.",
    id: 3353,
    name: 'Peacock',
    slug: 'peacock',
  },
  {
    description: 'Streaming service for anime.',
    id: 1112,
    name: 'Crunchyroll',
    slug: 'crunchyroll',
  },
  {
    description:
      "The BBC's flagship channel, free to air across the United Kingdom.",
    id: 4,
    name: 'BBC One',
    slug: 'bbc-one',
  },
  {
    description:
      "The BBC's second channel, known for documentaries, comedy and arts.",
    id: 332,
    name: 'BBC Two',
    slug: 'bbc-two',
  },
  {
    description: "The BBC's channel for younger audiences.",
    id: 3,
    name: 'BBC Three',
    slug: 'bbc-three',
  },
  {
    description: "The BBC's channel for arts, culture and documentaries.",
    id: 100,
    name: 'BBC Four',
    slug: 'bbc-four',
  },
  {
    description: "ITV's main commercial channel in the United Kingdom.",
    id: 9,
    name: 'ITV1',
    slug: 'itv1',
  },
  {
    description: 'British public-service broadcaster funded by advertising.',
    id: 26,
    name: 'Channel 4',
    slug: 'channel-4',
  },
  {
    description: "Sky's drama channel in the UK, long the home of HBO series.",
    id: 1063,
    name: 'Sky Atlantic',
    slug: 'sky-atlantic',
  },
  {
    description:
      'American cable channel behind Mad Men, Breaking Bad and The Walking Dead.',
    id: 174,
    name: 'AMC',
    slug: 'amc',
  },
  {
    description:
      'American cable channel behind The Shield, Sons of Anarchy and Atlanta.',
    id: 88,
    name: 'FX',
    slug: 'fx',
  },
  {
    description:
      'American premium cable channel behind Dexter, Homeland and Billions.',
    id: 67,
    name: 'Showtime',
    slug: 'showtime',
  },
  {
    description:
      'American premium cable channel behind Outlander and Spartacus.',
    id: 318,
    name: 'STARZ',
    slug: 'starz',
  },
  {
    description:
      'American broadcast network, home to Friends, The Office and Saturday Night Live.',
    id: 6,
    name: 'NBC',
    slug: 'nbc',
  },
  {
    description:
      'American broadcast network, home to Survivor and the NCIS franchise.',
    id: 16,
    name: 'CBS',
    slug: 'cbs',
  },
  {
    description: "American broadcast network, home to Lost and Grey's Anatomy.",
    id: 2,
    name: 'ABC',
    slug: 'abc',
  },
  {
    description:
      'American broadcast network, home to The Simpsons and The X-Files.',
    id: 19,
    name: 'Fox',
    slug: 'fox',
  },
  {
    description:
      'American broadcast network formed in 2006 from The WB and UPN.',
    id: 71,
    name: 'The CW',
    slug: 'the-cw',
  },
  {
    description: 'American cable channel behind Monk, Suits and Mr. Robot.',
    id: 30,
    name: 'USA Network',
    slug: 'usa-network',
  },
  {
    description:
      'American cable channel behind The Closer and Rizzoli & Isles.',
    id: 41,
    name: 'TNT',
    slug: 'tnt',
  },
  {
    description: 'American cable channel known for comedy.',
    id: 68,
    name: 'TBS',
    slug: 'tbs',
  },
  {
    description: 'American cable channel behind South Park and The Daily Show.',
    id: 47,
    name: 'Comedy Central',
    slug: 'comedy-central',
  },
  {
    description:
      'American cable channel that launched in 1981 as a music-video network.',
    id: 33,
    name: 'MTV',
    slug: 'mtv',
  },
  {
    description: 'American cable channel for science fiction and fantasy.',
    id: 77,
    name: 'Syfy',
    slug: 'syfy',
  },
  {
    description: "Cartoon Network's late-night block, behind Rick and Morty.",
    id: 80,
    name: 'Adult Swim',
    slug: 'adult-swim',
  },
  {
    description: 'American cable channel for animation.',
    id: 56,
    name: 'Cartoon Network',
    slug: 'cartoon-network',
  },
  {
    description: "American children's channel behind SpongeBob SquarePants.",
    id: 13,
    name: 'Nickelodeon',
    slug: 'nickelodeon',
  },
  {
    description: "American children's channel owned by Disney.",
    id: 54,
    name: 'Disney Channel',
    slug: 'disney-channel',
  },
  {
    description: 'American public broadcaster, home to Masterpiece and Nova.',
    id: 14,
    name: 'PBS',
    slug: 'pbs',
  },
  {
    description: 'American cable channel for history and documentary series.',
    id: 65,
    name: 'History',
    slug: 'history',
  },
  {
    description: "Japan's public broadcaster.",
    id: 2334,
    name: 'NHK',
    slug: 'nhk',
  },
  {
    description: 'Japanese commercial broadcaster that aired Death Note.',
    id: 57,
    name: 'Nippon TV',
    slug: 'nippon-tv',
  },
  {
    description: 'Japanese commercial broadcaster in Tokyo.',
    id: 103,
    name: 'tv asahi',
    slug: 'tv-asahi',
  },
  {
    description: 'Japanese commercial broadcaster in Tokyo.',
    id: 1,
    name: 'Fuji TV',
    slug: 'fuji-tv',
  },
  {
    description: 'Japanese commercial broadcaster known for anime.',
    id: 98,
    name: 'TV Tokyo',
    slug: 'tv-tokyo',
  },
  {
    description: 'Japanese regional broadcaster known for late-night anime.',
    id: 614,
    name: 'TOKYO MX',
    slug: 'tokyo-mx',
  },
  {
    description:
      'South Korean cable channel behind Reply 1988 and Crash Landing on You.',
    id: 866,
    name: 'tvN',
    slug: 'tvn',
  },
  {
    description: 'South Korean cable channel behind Sky Castle.',
    id: 885,
    name: 'JTBC',
    slug: 'jtbc',
  },
  {
    description: "The second channel of South Korea's public broadcaster KBS.",
    id: 342,
    name: 'KBS2',
    slug: 'kbs2',
  },
  {
    description: 'South Korean commercial broadcaster.',
    id: 156,
    name: 'SBS',
    slug: 'sbs',
  },
  {
    description: 'South Korean broadcaster, Munhwa Broadcasting Corporation.',
    id: 97,
    name: 'MBC',
    slug: 'mbc',
  },
  {
    description:
      "The main channel of Denmark's public broadcaster, behind Borgen and The Killing.",
    id: 391,
    name: 'DR1',
    slug: 'dr1',
  },
  {
    description: "The second channel of Denmark's public broadcaster.",
    id: 196,
    name: 'DR2',
    slug: 'dr2',
  },
  {
    description: 'Danish commercial broadcaster.',
    id: 125,
    name: 'TV 2',
    slug: 'tv-2',
  },
  {
    description: "The main channel of Norway's public broadcaster.",
    id: 379,
    name: 'NRK1',
    slug: 'nrk1',
  },
  {
    description: "The main channel of Sweden's public broadcaster.",
    id: 356,
    name: 'SVT1',
    slug: 'svt1',
  },
  {
    description: "The second channel of Sweden's public broadcaster.",
    id: 258,
    name: 'SVT2',
    slug: 'svt2',
  },
  {
    description: 'Swedish commercial broadcaster.',
    id: 352,
    name: 'TV4',
    slug: 'tv4',
  },
  {
    description: 'Nordic streaming service owned by Viaplay Group.',
    id: 1585,
    name: 'Viaplay',
    slug: 'viaplay',
  },
  {
    description: 'German public broadcaster.',
    id: 31,
    name: 'ZDF',
    slug: 'zdf',
  },
  {
    description: "The main channel of Germany's public broadcaster ARD.",
    id: 308,
    name: 'Das Erste',
    slug: 'das-erste',
  },
  {
    description: 'German commercial broadcaster.',
    id: 207,
    name: 'RTL',
    slug: 'rtl',
  },
  {
    description: 'French commercial channel, privatised in 1987.',
    id: 290,
    name: 'TF1',
    slug: 'tf1',
  },
  {
    description: 'French public channel.',
    id: 361,
    name: 'France 2',
    slug: 'france-2',
  },
  {
    description: 'French pay-TV channel, behind Spiral and The Bureau.',
    id: 285,
    name: 'Canal+',
    slug: 'canal-plus',
  },
  {
    description: 'Franco-German cultural channel.',
    id: 662,
    name: 'ARTE',
    slug: 'arte',
  },
  {
    description: "The main channel of Italy's public broadcaster.",
    id: 533,
    name: 'Rai 1',
    slug: 'rai-1',
  },
  {
    description: 'Spanish commercial channel.',
    id: 400,
    name: 'Antena 3',
    slug: 'antena-3',
  },
  {
    description: 'Spanish commercial channel.',
    id: 53,
    name: 'Telecinco',
    slug: 'telecinco',
  },
  {
    description: 'Spanish pay-TV platform operated by Telefonica.',
    id: 6920,
    name: 'Movistar Plus',
    slug: 'movistar-plus',
  },
  {
    description: 'Australian commercial network.',
    id: 66,
    name: 'Nine Network',
    slug: 'nine-network',
  },
  {
    description: 'Australian commercial network.',
    id: 118,
    name: 'Seven Network',
    slug: 'seven-network',
  },
  {
    description: 'Canadian streaming service.',
    id: 1344,
    name: 'Crave',
    slug: 'crave',
  },
  {
    description: 'Brazilian streaming service of the Globo group.',
    id: 3290,
    name: 'Globoplay',
    slug: 'globoplay',
  },
];
