// The source file, not the package: Node strips types only outside node_modules.
import {
  landingSlugForId,
  themeBySlug,
} from '../../../../../../packages/constants/src/landings';

/**
 * Which catalogue shows carry a TMDB keyword. A theme's strongest keyword,
 * and any keyword outside the themes, gets a stable pseudo-random third of
 * the catalogue when it isn't listed here, so every theme landing has shows;
 * the other keywords of a theme's set (TMDB's duplicates) only the shows
 * listed, so a set is about as big as its strongest keyword. Extend it when
 * a spec needs a theme's shows.
 */
export const KEYWORD_SHOWS: Readonly<Record<number, ReadonlyArray<string>>> = {
  // detective
  703: [
    'truedetective',
    'luther',
    'lineofduty',
    'monster',
    'shetland',
    'cracker',
    'primesuspect',
    'endeavour',
    'sherlock',
    'deptq',
    'b99',
  ],
  // time travel
  4379: [
    'outlander',
    'travelers',
    'twelvemonkeys',
    'eleven',
    'loki',
    'doctorwho',
    'dark',
    'lifeonmars',
  ],
  // dystopia
  4565: [
    'blackmirror',
    'silo',
    'pluribus',
    'handmaid',
    'snowpiercer',
    'highcastle',
    'aot',
    'alice',
    'formankind',
    'edgerunners',
    'electricdreams',
  ],
  // politics
  6078: [
    'succession',
    'morningshow',
    'billions',
    'nightmanager',
    'slowhorses',
    'borgen',
    'handmaid',
  ],
  // anthology
  9706: ['blackmirror', 'electricdreams', 'fargo', 'truedetective'],
  9840: ['outlander', 'cloy', 'firstlove', 'goblin', 'reply1988'],
  // organized crime
  10291: [
    'sopranos',
    'peaky',
    'mocro',
    'moneyheist',
    'narcos',
    'breakingbad',
    'bcs',
    'mobland',
    'thousand',
  ],
  // serial killer
  10714: [
    'thefall',
    'dexres',
    'deathnote',
    'truedetective',
    'luther',
    'cracker',
  ],
  // time loop (in Time travel's set)
  10854: ['dark', 'devs'],
  // miniseries
  11162: [
    'task',
    'blackrabbit',
    'adolescence',
    'penguin',
    'eric',
    'devs',
    'chernobyl',
    'eleven',
  ],
  11612: ['pitt', 'sixfeet'],
  // cyberpunk (in Dystopia's set)
  12190: ['edgerunners'],
  // medical drama and hospital (Medical dramas, a genre-bound theme: Drama)
  208788: ['pitt'],
  // police procedural (in Police's set)
  268067: ['rookie', 'b99', 'lineofduty', 'bosch', 'shetland', 'primesuspect'],
  // horror, thriller, romance: the genres TMDB only has as a keyword
  315058: ['strangerthings', 'tlou', 'kingdom', 'midnight', 'trueblood'],
  316362: ['nightmanager', 'slowhorses', 'reacher', 'bosch', 'thefall'],
};

const hash = (value: string) =>
  [...value].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 9973,
    7,
  );

/** A keyword of a theme's set after its strongest one */
const isDuplicate = (keyword: number) => {
  const slug = landingSlugForId('theme', keyword);
  return slug !== undefined && themeBySlug(slug)?.keywordIds[0] !== keyword;
};

export const hasKeyword = (key: string, keyword: number) =>
  KEYWORD_SHOWS[keyword]?.includes(key) ??
  (!isDuplicate(keyword) && hash(`${key}:${keyword}`) % 3 === 0);
