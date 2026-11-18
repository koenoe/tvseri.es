/**
 * The one hand-written line under each genre's name.
 * Short, plain lines.
 */
const GENRE_LINES: Readonly<Record<string, string>> = {
  'action-adventure':
    'Chases, quests and fights, and the people who survive them.',
  animation: 'Drawn, painted and rendered stories, for every age.',
  comedy: 'Sitcoms, satires and the series that make you laugh out loud.',
  crime: 'Detectives, gangsters, heists and the people who chase them.',
  documentary: 'True stories, told by the people who lived them.',
  drama: 'Families, friendships and lives under pressure.',
  family: 'Series to watch together, whatever your age.',
  horror:
    'Ghosts, killers and monsters, and the people trying to survive them.',
  kids: 'Cartoons, adventures and stories made for children.',
  mystery: 'Secrets, puzzles and the questions that keep you watching.',
  news: 'The day’s events and the people who report them.',
  reality: 'Real people, real competitions and real drama.',
  romance:
    'First loves, second chances and the people who fall for each other.',
  'sci-fi-fantasy': 'Other worlds, other times and the rules that bend there.',
  soap: 'Long-running stories of families, love and betrayal.',
  talk: 'Hosts, guests and conversations, night after night.',
  thriller: 'Conspiracies, chases and secrets, with time running out.',
  'war-politics': 'Battlefields, back rooms and the people in power.',
  western: 'Frontier towns, outlaws and the long ride west.',
};

/** The genre's line, or undefined for a slug that isn't a genre landing */
export const genreLine = (slug: string): string | undefined =>
  GENRE_LINES[slug];
