export type StepFlags = Readonly<{
  alreadySeen: boolean;
  history: boolean;
  services: boolean;
}>;

export const doneCount = (steps: StepFlags): number =>
  Number(steps.services) + Number(steps.alreadySeen) + Number(steps.history);

/** "1 of 3 done" (all three done, the card is gone) */
export function progressText(done: number): string {
  return `${done} of 3 done`;
}
