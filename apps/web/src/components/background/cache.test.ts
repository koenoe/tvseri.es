import { describe, expect, it } from 'vitest';

import { restoreBackground, saveBackground } from './cache';

const SERVER = { backgroundColor: '#101010', backgroundImage: 'server.jpg' };

describe('background cache', () => {
  it('restores the state an entry was left with on Back', () => {
    saveBackground('k-show-a', {
      backgroundColor: '#aa0000',
      backgroundImage: 'a.jpg',
    });
    saveBackground('k-show-b', {
      backgroundColor: '#00bb00',
      backgroundImage: 'b.jpg',
    });

    expect(
      restoreBackground({
        historyKey: 'k-show-a',
        initial: SERVER,
        isBack: true,
      }),
    ).toEqual({ backgroundColor: '#aa0000', backgroundImage: 'a.jpg' });
    expect(
      restoreBackground({
        historyKey: 'k-show-b',
        initial: SERVER,
        isBack: true,
      }),
    ).toEqual({ backgroundColor: '#00bb00', backgroundImage: 'b.jpg' });
  });

  it('starts from the server props on a forward navigation', () => {
    saveBackground('k-forward', {
      backgroundColor: '#aa0000',
      backgroundImage: 'a.jpg',
    });

    expect(
      restoreBackground({
        historyKey: 'k-forward',
        initial: SERVER,
        isBack: false,
      }),
    ).toEqual(SERVER);
  });

  it('starts from the server props on Back to an entry it never saw', () => {
    expect(
      restoreBackground({
        historyKey: 'k-unknown',
        initial: SERVER,
        isBack: true,
      }),
    ).toEqual(SERVER);
  });

  it('keeps the latest state per entry', () => {
    saveBackground('k-twice', {
      backgroundColor: '#aa0000',
      backgroundImage: 'a.jpg',
    });
    saveBackground('k-twice', {
      backgroundColor: '#0000cc',
      backgroundImage: 'c.jpg',
    });

    expect(
      restoreBackground({
        historyKey: 'k-twice',
        initial: SERVER,
        isBack: true,
      }),
    ).toEqual({ backgroundColor: '#0000cc', backgroundImage: 'c.jpg' });
  });
});
