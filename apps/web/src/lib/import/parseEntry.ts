/**
 * Single source of truth for reading viewing-history entries such as
 * "Stranger Things: Stranger Things 4: Chapter One: The Hellfire Club".
 * Used by the client (to split a combined column into title/season/episode)
 * and by the import route (to turn season/episode labels into numbers).
 */

const CARDINALS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];
const ORDINALS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
  'twentieth',
];
const SEASON_LABELS = [
  'Season',
  'Seizoen',
  'Deel',
  'Hoofdstuk',
  'Boek',
  'Series',
  'Part',
  'Volume',
  // Netflix names some seasons after the show, e.g. "Stranger Things 4"
  'Tiger King',
  'Stranger Things',
];
const LIMITED_SERIES_LABELS = ['Limited Series', 'Miniseries', 'Miniserie'];
const EPISODE_LABELS = ['Chapter', 'Episode', 'Aflevering'];

const NUMBER = `\\d+|${CARDINALS.join('|')}`;
const ORDINAL = `\\d+(?:st|nd|rd|th)|${ORDINALS.join('|')}`;

// Groups: 1 = season number, 2 = season ordinal, 3 = limited series
const SEASON_REGEX = new RegExp(
  `\\b(?:(?:${SEASON_LABELS.join('|')})\\s+(${NUMBER})|(?:The\\s+Complete\\s+)?(${ORDINAL})\\s+(?:Season|Series)|(${LIMITED_SERIES_LABELS.join('|')}))\\b`,
  'i',
);
// Groups: 1 = episode number, 2 = episode ordinal
const EPISODE_REGEX = new RegExp(
  `\\b(?:(?:${EPISODE_LABELS.join('|')})[.\\s#-]*(${NUMBER})|(${ORDINAL})\\s+Episode)\\b`,
  'i',
);
const LEADING_DELIMITER_REGEX = /^[:\\—–-]\s*/;
const TRAILING_DELIMITER_REGEX = /\s*[:\\—–-]\s*$/;

const toNumber = (
  number: string | undefined,
  ordinal: string | undefined,
): number | null => {
  if (number) {
    const value = /^\d+$/.test(number)
      ? Number.parseInt(number, 10)
      : CARDINALS.indexOf(number.toLowerCase()) + 1;
    return value > 0 ? value : null;
  }
  if (ordinal) {
    const value = /^\d/.test(ordinal)
      ? Number.parseInt(ordinal, 10)
      : ORDINALS.indexOf(ordinal.toLowerCase()) + 1;
    return value > 0 ? value : null;
  }
  return null;
};

const getDelimiter = (value: string): string => {
  const colonCount = (value.match(/:\s/g) ?? []).length;
  const dashCount = (value.match(/-\s/g) ?? []).length;
  const emDashCount = (value.match(/–\s/g) ?? []).length;

  if (colonCount >= dashCount && colonCount >= emDashCount) {
    return ': ';
  }
  return dashCount >= emDashCount ? '- ' : '– ';
};

export type SplitEntry = Readonly<{
  title: string;
  season: string;
  episode: string;
}>;

/**
 * Splits a combined viewing-history value into its title, season label and
 * episode label. Season/episode are returned as text; use
 * `parseSeasonNumber`/`parseEpisodeNumber` to turn them into numbers.
 */
export const splitEntry = (value: string): SplitEntry => {
  const seasonMatch = SEASON_REGEX.exec(value);
  if (seasonMatch) {
    return {
      episode: value
        .slice(seasonMatch.index + seasonMatch[0].length)
        .trim()
        .replace(LEADING_DELIMITER_REGEX, ''),
      season: seasonMatch[0],
      title: value
        .slice(0, seasonMatch.index)
        .replace(TRAILING_DELIMITER_REGEX, '')
        .trim(),
    };
  }

  const episodeMatch = EPISODE_REGEX.exec(value);
  // Only a labelled episode ("Chapter One", "Episode 3") marks where the episode starts
  if (episodeMatch?.[1]) {
    return {
      episode: value.slice(episodeMatch.index).trim(),
      season: '',
      title: value
        .slice(0, episodeMatch.index)
        .replace(TRAILING_DELIMITER_REGEX, '')
        .trim(),
    };
  }

  const delimiter = getDelimiter(value);
  const parts = value.split(delimiter);
  if (parts.length > 2) {
    return {
      episode: parts[parts.length - 1]!,
      season: '',
      title: parts.slice(0, -1).join(delimiter),
    };
  }
  if (parts.length === 2) {
    return { episode: parts[1]!, season: '', title: parts[0]! };
  }
  return { episode: '', season: '', title: value };
};

/** Season number from a season label or number; defaults to 1. */
export const parseSeasonNumber = (value: string | number): number => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : 1;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(1, Number.parseInt(trimmed, 10));
  }
  const match = SEASON_REGEX.exec(trimmed);
  return toNumber(match?.[1], match?.[2]) ?? 1;
};

/** Episode number from an episode label or number, or null if there is none. */
export const parseEpisodeNumber = (value: string | number): number | null => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const number = Number.parseInt(trimmed, 10);
    return number > 0 ? number : null;
  }
  const match = EPISODE_REGEX.exec(trimmed);
  return toNumber(match?.[1], match?.[2]);
};
