/**
 * A value saved whole (`PUT`) across overlapping saves: a save that
 * succeeded means the server holds exactly what it sent, so the shown value
 * is the latest successful save's (an older answer landing late never rolls
 * it back). `wanted` has every change whose save hasn't answered, so quick
 * changes each build on the one before; once nothing is in flight it is the
 * server's value again, so a failed save doesn't leave the next change
 * working from a value the server never got.
 */
export function createSaveLedger<T>(initial: T) {
  let wanted = initial;
  let saved = initial;
  let savedSeq = 0;
  let seq = 0;
  // boxed, so a value that is itself `undefined` still counts as sent
  const inFlight = new Map<number, Readonly<{ value: T }>>();

  return {
    /** A save answered: the value the server now has, to show */
    settle(number: number, ok: boolean): T {
      const sent = inFlight.get(number);
      if (ok && sent && number > savedSeq) {
        saved = sent.value;
        savedSeq = number;
      }
      inFlight.delete(number);
      if (inFlight.size === 0) {
        wanted = saved;
      }
      return saved;
    },
    /** A change: the value to send, and its number for `settle` */
    want(change: (wanted: T) => T) {
      wanted = change(wanted);
      seq += 1;
      inFlight.set(seq, { value: wanted });
      return { seq, value: wanted } as const;
    },
    get wanted() {
      return wanted;
    },
  };
}
