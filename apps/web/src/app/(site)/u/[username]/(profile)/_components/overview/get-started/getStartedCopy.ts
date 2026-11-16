import type { WatchProvider } from '@tvseri.es/schemas';

export type StepFlags = Readonly<{
  alreadySeen: boolean;
  history: boolean;
  services: boolean;
}>;

export const doneCount = (steps: StepFlags): number =>
  Number(steps.services) + Number(steps.alreadySeen) + Number(steps.history);

/** "1 of 3 done", "All set" */
export function progressText(done: number): string {
  return done >= 3 ? 'All set' : `${done} of 3 done`;
}

/** The services list with one provider switched on or off (the ones not shown stay as they are) */
export function toggleProvider(
  selected: ReadonlyArray<WatchProvider>,
  provider: WatchProvider,
  on: boolean,
): WatchProvider[] {
  const rest = selected.filter((entry) => entry.id !== provider.id);
  return on ? [...rest, provider] : rest;
}
