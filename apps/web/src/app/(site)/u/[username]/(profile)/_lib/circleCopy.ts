import type {
  CircleMatch,
  CirclePerson,
  CirclePick,
  TasteLevel,
} from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import { joinAnd } from '@/lib/text/fitNames';
import { LEVELS } from '../_components/visitor/match/levels';

/**
 * The circle's words: the Circle page's rows and the overview's From your
 * circle card. Pure, so the rows stay plain server markup.
 */

/** How many shows the one-line reason names: the row has room for two */
const NAMED = 2;

/** "four more": small counts in words */
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
];

const inWords = (count: number) => WORDS[count] ?? String(count);

type Shared = CircleMatch['sharedShows'][number];

const loves = (show: Shared) => show.relation === 'both-favourite';

/** "love The Pitt and watch Severance", "watch The White Lotus and MobLand" */
function bothDo(shows: ReadonlyArray<Shared>): string {
  const loved = shows.filter(loves).map((show) => show.title);
  const watched = shows.filter((show) => !loves(show)).map((s) => s.title);
  const parts = [
    loved.length > 0 ? `love ${joinAnd(loved)}` : null,
    watched.length > 0 ? `watch ${joinAnd(watched)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.join(' and ');
}

/**
 * The reason beside the level (the proof, one line): what you both love
 * or watch for a real match, "You share MobLand and four more" for a low
 * one, "Different taste: …" for a very low one, and the count so far
 * without a level. Shows come strongest first from the API.
 */
export function proofLine({
  level,
  sharedCount,
  sharedShows,
}: CircleMatch): string {
  if (!level) {
    return sharedCount === 0
      ? 'Nothing shared yet'
      : `Not enough shared yet: ${plural(sharedCount, 'series', 'series')}`;
  }
  const named = sharedShows.slice(0, NAMED);
  const [first] = named;
  if (!first) {
    return `You share ${plural(sharedCount, 'series', 'series')}`;
  }
  if (level === 'very-low') {
    return `Different taste: you share ${joinAnd(named.map((show) => show.title))}`;
  }
  if (level === 'low') {
    const rest = sharedCount - 1;
    return rest > 0
      ? `You share ${first.title} and ${inWords(rest)} more`
      : `You share ${first.title}`;
  }
  return `You both ${bothDo(named)}`;
}

/** "Super match", "Very high match"; "No level yet" under 5 shared shows */
export function levelLine(level: TasteLevel | null): string {
  const label = levelLabel(level);
  return label ? `${label} match` : 'No level yet';
}

/** The header count: "8 following · 6 followers" */
export function circleCounts({
  followers,
  following,
}: Readonly<{ followers: number; following: number }>): string {
  return `${plural(following, 'following', 'following')} · ${plural(followers, 'follower')}`;
}

type Relation = Readonly<{
  isFollower: boolean;
  isFollowing: boolean;
  isMe: boolean;
}>;

/** A visitor's row tags, from the viewer's side: It’s you · You follow · Follows you */
export function relationTags({
  isFollower,
  isFollowing,
  isMe,
}: Relation): ReadonlyArray<string> {
  if (isMe) {
    return ['It’s you'];
  }
  return [
    isFollowing ? 'You follow' : null,
    isFollower ? 'Follows you' : null,
  ].filter((tag): tag is string => tag !== null);
}

/** Under "You don’t follow anyone yet": how, and who already follows you */
export function followNobodyLine(followers: number): string {
  const how = 'Follow someone from their profile';
  if (followers === 0) {
    return `${how}.`;
  }
  return followers === 1
    ? `${how}; the person below already follows you.`
    : `${how}; the ${inWords(followers)} people below already follow you.`;
}

/** The Circle's fixed lines */
export const CIRCLE_COPY = {
  /** At most 100 rows (`capped`) */
  capped: 'Showing your 100 most recent follows',
  following: 'You follow',
  followNobody: 'You don’t follow anyone yet',
  followsYou: 'Follows you',
  matchKeyText:
    'Series you both favourited count 3, both finished 2, any other shared series 1. Under 5 shared series there is no level yet.',
  matchKeyTitle: 'How a match is made',
  /** No "New to you ›" on the rows, so the line doesn't name it */
  ownerDescription:
    'The people you follow, closest taste first. A row opens their profile.',
} as const;

/** Someone else's Circle: "edw1n’s circle", "edw1n follows", "Follows edw1n" */
export const visitorCopy = (username: string) =>
  ({
    description: `Who ${username} follows, and who follows them. Your own match with each person is on their profile.`,
    followers: `Follows ${username}`,
    followersEmpty: `Nobody follows ${username} yet`,
    following: `${username} follows`,
    followingEmpty: `${username} doesn’t follow anyone yet`,
    title: `${username}’s circle`,
  }) as const;

/** "Super", "Very high"; null while the match has no level yet (under 5 shared shows) */
export function levelLabel(level: TasteLevel | null): string | null {
  return level ? LEVELS[level].word : null;
}

/** The two top levels are "your closest matches" */
const isClose = (person: CirclePerson) =>
  person.level === 'super' || person.level === 'very-high';

type ReasonPick = Pick<CirclePick, 'doorGenre' | 'kind' | 'people'>;

/**
 * The card's line under the meta (From your circle): why this show.
 * "A favourite of your closest match.", "Both your closest matches finished
 * it.", "ivo’s door to anime." Names stand in where the people are not
 * close matches, so the line never claims more than the match says.
 */
export function pickReason({ doorGenre, kind, people }: ReasonPick): string {
  const [first, second] = people;
  if (!first) {
    return kind === 'favourite'
      ? 'A favourite in your circle.'
      : 'Finished by people in your circle.';
  }
  if (doorGenre) {
    return `${first.username}’s door to ${doorGenre.toLowerCase()}.`;
  }
  if (!second) {
    if (kind === 'favourite') {
      return isClose(first)
        ? 'A favourite of your closest match.'
        : `A favourite of ${first.username}.`;
    }
    return isClose(first)
      ? 'Your closest match finished it.'
      : `${first.username} finished it.`;
  }
  const both = isClose(first) && isClose(second);
  if (kind === 'favourite') {
    return both
      ? 'A favourite of both your closest matches.'
      : `A favourite of ${first.username} and ${second.username}.`;
  }
  return both
    ? 'Both your closest matches finished it.'
    : `${first.username} and ${second.username} finished it.`;
}

/** "3 seasons, 26 episodes" (the pick's second fact) */
export function seasonsAndEpisodes(
  seasons: number,
  episodes: number,
): string | null {
  const parts = [
    seasons > 0 ? plural(seasons, 'season') : null,
    episodes > 0 ? plural(episodes, 'episode') : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : null;
}

/** The match chip's accessible name: "juno, Super match" */
export function personLabel(person: CirclePerson): string {
  const level = levelLabel(person.level);
  return level ? `${person.username}, ${level} match` : person.username;
}
