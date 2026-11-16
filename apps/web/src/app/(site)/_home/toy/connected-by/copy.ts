/** "Malcolm in the Middle to Better Call Saul, in 2 steps" (HMFinal `e2-grh`): every path is two */
export const pathTitle = (from: string, to: string) =>
  `${from} to ${to}, in 2 steps`;

/**
 * The line under a person: the role in the show before them and the one
 * after ("Hal · Walter White"), or one role "in both" when it's the same
 * character ("Saul Goodman, in both").
 */
export const roleLine = (characters: ReadonlyArray<string>): string => {
  const roles = characters.map((role) => role.trim()).filter(Boolean);
  const [first, second] = roles;
  if (!first) {
    return '';
  }
  if (!second) {
    return first;
  }
  return first.toLowerCase() === second.toLowerCase()
    ? `${first}, in both`
    : `${first} · ${second}`;
};
