import type { WatchProvider } from '@tvseri.es/schemas';

import { servicesReducer, type WatchProviderAction } from './servicesReducer';

type List = ReadonlyArray<WatchProvider>;

/**
 * The viewer's services across overlapping saves. Each save
 * sends the whole list (`PUT`), so a save that succeeded means the server
 * holds exactly the list it sent: the shown list is the latest successful
 * save's (an older answer landing late never rolls it back). `wanted` is
 * the list with every tap whose save hasn't answered, so quick taps each
 * send all of them; once nothing is in flight it is the server's list
 * again, so a failed save doesn't leave the next tap working from a list
 * the server never got.
 */
export function createSaveLedger(initial: List) {
  let wanted = initial;
  let saved = initial;
  let savedSeq = 0;
  let seq = 0;
  const inFlight = new Map<number, List>();

  return {
    /** A save answered: the list the server now has, to show */
    settle(number: number, ok: boolean): List {
      const sent = inFlight.get(number);
      inFlight.delete(number);
      if (ok && sent && number > savedSeq) {
        saved = sent;
        savedSeq = number;
      }
      if (inFlight.size === 0) {
        wanted = saved;
      }
      return saved;
    },
    /** A tap: the list to send, and its number for `settle` */
    want(action: WatchProviderAction) {
      wanted = servicesReducer(wanted, action);
      seq += 1;
      inFlight.set(seq, wanted);
      return { list: wanted, seq } as const;
    },
    get wanted() {
      return wanted;
    },
  };
}
