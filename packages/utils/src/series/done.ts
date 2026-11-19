/**
 * Done, the one rule for every progress fill and percentage (web and API):
 * the aired episodes with a mark, watched or skipped, so the aired ones
 * less the ones still open (neither watched nor skipped).
 */
export const doneCount = (aired: number, open: number): number =>
  Math.max(0, aired - open);
