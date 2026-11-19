/**
 * Reads viewing-history entries such as
 * "Stranger Things: Stranger Things 4: Chapter One: The Hellfire Club".
 * The importer splits a combined column into title/season/episode with it;
 * the route's matcher turns season/episode labels into numbers.
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
/** TMDB keeps specials, extras and the like in season 0 */
const SPECIALS_LABELS = ['Specials', 'Special'];
const EPISODE_LABELS = ['Chapter', 'Episode', 'Aflevering'];

const NUMBER = `\\d+|${CARDINALS.join('|')}`;
const ORDINAL = `\\d+(?:st|nd|rd|th)|${ORDINALS.join('|')}`;

// Groups: 1 = season number, 2 = season ordinal, 3 = limited series
const SEASON_REGEX = new RegExp(
  `\\b(?:(?:${SEASON_LABELS.join('|')})\\s+(${NUMBER})|(?:The\\s+Complete\\s+)?(${ORDINAL})\\s+(?:Season|Series)|(${LIMITED_SERIES_LABELS.join('|')}))\\b`,
  'i',
);
// "Specials" is only a season label when it is a part of its own: after the
// title and before the episode ("Black Mirror: Specials: White Christmas")
const SPECIALS_REGEX = new RegExp(
  `(?:^|[:—–-]\\s+)(${SPECIALS_LABELS.join('|')})(?=\\s*(?:[:—–-]\\s|$))`,
  'i',
);
// Groups: 1 = episode number, 2 = episode ordinal
const EPISODE_REGEX = new RegExp(
  `\\b(?:(?:${EPISODE_LABELS.join('|')})[.\\s#-]*(${NUMBER})|(${ORDINAL})\\s+Episode)\\b`,
  'i',
);
// Netflix cuts long titles short: "Fit for TV: The Reality of the Biggest..."
const CUT_REGEX = /\s*(?:\.\.\.|…)$/;
const LEADING_DELIMITER_REGEX = /^[:\\—–-]\s*/;
const TRAILING_DELIMITER_REGEX = /\s*[:\\—–-]\s*$/;

const toNumber = (
  number: string | undefined,
  ordinal: string | undefined,
  minimum = 1,
): number | null => {
  if (number) {
    const value = /^\d+$/.test(number)
      ? Number.parseInt(number, 10)
      : CARDINALS.indexOf(number.toLowerCase()) + 1;
    return value >= minimum ? value : null;
  }
  if (ordinal) {
    const value = /^\d/.test(ordinal)
      ? Number.parseInt(ordinal, 10)
      : ORDINALS.indexOf(ordinal.toLowerCase()) + 1;
    return value > 0 ? value : null;
  }
  return null;
};

/**
 * The text before Netflix's cut ("Any..." is "Any"), or null for a text that
 * isn't cut short. Matching takes it as the start of the full title.
 */
export const cutPrefix = (value: string): string | null => {
  const trimmed = value.trim();
  return CUT_REGEX.test(trimmed) ? trimmed.replace(CUT_REGEX, '') : null;
};

const LABELS = [
  ...SEASON_LABELS,
  ...LIMITED_SERIES_LABELS,
  ...SPECIALS_LABELS,
].map((label) => label.toLowerCase());

/** "Seas...", "Limited Ser…": a season label the cut landed in */
const isCutLabel = (part: string) => {
  const prefix = cutPrefix(part)?.toLowerCase();
  return Boolean(prefix) && LABELS.some((label) => label.startsWith(prefix!));
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
 * `recogniseSeasonNumber`/`parseEpisodeNumber` to turn them into numbers.
 */
export const splitEntry = (value: string): SplitEntry => {
  const seasonMatch = SEASON_REGEX.exec(value);
  if (seasonMatch) {
    const title = value
      .slice(0, seasonMatch.index)
      .replace(TRAILING_DELIMITER_REGEX, '')
      .trim();
    const rest = value.slice(seasonMatch.index + seasonMatch[0].length);
    // Cut right after the season: "Season 2..." may be Season 21
    if (cutPrefix(rest) === '') {
      return { episode: '', season: '', title };
    }
    return {
      episode: rest.trim().replace(LEADING_DELIMITER_REGEX, ''),
      season: seasonMatch[0],
      title,
    };
  }

  const specialsMatch = SPECIALS_REGEX.exec(value);
  if (specialsMatch?.[1]) {
    const start = specialsMatch.index + specialsMatch[0].length;
    return {
      episode: value.slice(start).trim().replace(LEADING_DELIMITER_REGEX, ''),
      season: specialsMatch[1],
      title: value
        .slice(0, specialsMatch.index)
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
  // Cut in the season label: neither season nor episode can be read
  if (parts.length > 1 && isCutLabel(parts.at(-1)!)) {
    return {
      episode: '',
      season: '',
      title: parts.slice(0, -1).join(delimiter).trim(),
    };
  }
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

/**
 * The season a label or number names, or null when it names none: empty, or a
 * label we don't know ("Book Two"). Null means "any season": the matcher
 * looks the episode up by its title, and takes a number only when the show
 * has one regular season, so an unreadable season is never guessed. Season 0
 * ("Specials", "Season 0") is a season like any other; "Limited Series" is
 * season 1.
 */
export const recogniseSeasonNumber = (
  value: string | number,
): number | null => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (new RegExp(`^(?:${SPECIALS_LABELS.join('|')})$`, 'i').test(trimmed)) {
    return 0;
  }
  const match = SEASON_REGEX.exec(trimmed);
  if (match?.[3]) {
    return 1;
  }
  return match?.[1]
    ? toNumber(match[1], undefined, 0)
    : toNumber(undefined, match?.[2]);
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
