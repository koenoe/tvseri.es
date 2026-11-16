import type { WatchProvider } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { createSaveLedger } from './saveLedger';

const service = (id: number, name: string) =>
  ({ id, logo: '', name }) as unknown as WatchProvider;
const A = service(8, 'Netflix');
const B = service(9, 'Prime Video');
const C = service(10, 'Apple TV');
const names = (list: ReadonlyArray<WatchProvider>) => list.map((p) => p.name);
const add = (provider: WatchProvider) => ({ provider, type: 'add' as const });

describe('createSaveLedger: the shown list follows the server', () => {
  it('each tap sends the list with every tap before it', () => {
    const ledger = createSaveLedger([C]);
    expect(names(ledger.want(add(A)).list)).toEqual(['Apple TV', 'Netflix']);
    expect(names(ledger.want(add(B)).list)).toEqual([
      'Apple TV',
      'Netflix',
      'Prime Video',
    ]);
  });

  it('the first save fails, the second (which sent A and B) succeeds: both are saved', () => {
    const ledger = createSaveLedger([]);
    const first = ledger.want(add(A));
    const second = ledger.want(add(B));
    ledger.settle(first.seq, false);
    const shown = ledger.settle(second.seq, true);
    expect(names(shown)).toEqual(['Netflix', 'Prime Video']);
    expect(names(ledger.wanted)).toEqual(['Netflix', 'Prime Video']);
  });

  it('the same, answered in the other order', () => {
    const ledger = createSaveLedger([]);
    const first = ledger.want(add(A));
    const second = ledger.want(add(B));
    ledger.settle(second.seq, true);
    const shown = ledger.settle(first.seq, false);
    expect(names(shown)).toEqual(['Netflix', 'Prime Video']);
    expect(names(ledger.wanted)).toEqual(['Netflix', 'Prime Video']);
  });

  it('an older success landing after a newer one does not roll it back', () => {
    const ledger = createSaveLedger([]);
    const first = ledger.want(add(A));
    const second = ledger.want(add(B));
    ledger.settle(second.seq, true);
    expect(names(ledger.settle(first.seq, true))).toEqual([
      'Netflix',
      'Prime Video',
    ]);
  });

  it('the last save fails: back to what the server has, and the next tap starts from it', () => {
    const ledger = createSaveLedger([C]);
    const first = ledger.want(add(A));
    const second = ledger.want(add(B));
    ledger.settle(first.seq, true);
    expect(names(ledger.settle(second.seq, false))).toEqual([
      'Apple TV',
      'Netflix',
    ]);
    expect(names(ledger.wanted)).toEqual(['Apple TV', 'Netflix']);
  });

  it('every save fails: the list it started with', () => {
    const ledger = createSaveLedger([C]);
    const first = ledger.want(add(A));
    expect(names(ledger.settle(first.seq, false))).toEqual(['Apple TV']);
    expect(names(ledger.wanted)).toEqual(['Apple TV']);
  });
});
