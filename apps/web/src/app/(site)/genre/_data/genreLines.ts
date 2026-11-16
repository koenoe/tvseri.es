/**
 * The one hand-written line under each genre's name.
 * Crime's line is the approved design's; the others are drafts, short and
 * plain, waiting for the owner.
 */
const GENRE_LINES: Readonly<Record<string, string>> = {
  // DRAFT: owner approves
  'action-adventure':
    'Chases, quests and fights, and the people who survive them.',
  // DRAFT: owner approves
  animation: 'Drawn, painted and rendered stories, for every age.',
  // DRAFT: owner approves
  comedy: 'Sitcoms, satires and the series that make you laugh out loud.',
  crime: 'Detectives, gangsters, heists and the people who chase them.',
  // DRAFT: owner approves
  documentary: 'True stories, told by the people who lived them.',
  // DRAFT: owner approves
  drama: 'Families, friendships and lives under pressure.',
  // DRAFT: owner approves
  family: 'Series to watch together, whatever your age.',
  // DRAFT: owner approves
  horror:
    'Ghosts, killers and monsters, and the people trying to survive them.',
  // DRAFT: owner approves
  kids: 'Cartoons, adventures and stories made for children.',
  // DRAFT: owner approves
  mystery: 'Secrets, puzzles and the questions that keep you watching.',
  // DRAFT: owner approves
  news: 'The day’s events and the people who report them.',
  // DRAFT: owner approves
  reality: 'Real people, real competitions and real drama.',
  // DRAFT: owner approves
  romance:
    'First loves, second chances and the people who fall for each other.',
  // DRAFT: owner approves
  'sci-fi-fantasy': 'Other worlds, other times and the rules that bend there.',
  // DRAFT: owner approves
  soap: 'Long-running stories of families, love and betrayal.',
  // DRAFT: owner approves
  talk: 'Hosts, guests and conversations, night after night.',
  // DRAFT: owner approves
  thriller: 'Conspiracies, chases and secrets, with time running out.',
  // DRAFT: owner approves
  'war-politics': 'Battlefields, back rooms and the people in power.',
  // DRAFT: owner approves
  western: 'Frontier towns, outlaws and the long ride west.',
};

/** The genre's line, or undefined for a slug that isn't a genre landing */
export const genreLine = (slug: string): string | undefined =>
  GENRE_LINES[slug];
