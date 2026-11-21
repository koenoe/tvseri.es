import { afterEach, describe, expect, it } from 'vitest';

import {
  forgetModalOrigin,
  holdModalOrigin,
  modalOriginFor,
} from './modalOrigin';

const card = { height: 420, left: 32, top: 600, width: 852 };
const screen = { height: 900, width: 1440 };
const episode = { episodeNumber: 2, seasonNumber: 1 };

describe('the modal grows from the card it was opened from', () => {
  afterEach(forgetModalOrigin);

  it('once, for the episode the card opened', () => {
    holdModalOrigin(7, episode, card, 1000, screen);
    expect(modalOriginFor(7, episode, 1400, screen)).toEqual(card);
    // the open has used it: a later open grows from its own tile
    forgetModalOrigin();
    expect(modalOriginFor(7, episode, 1500, screen)).toBeNull();
  });

  it('not for another show or episode', () => {
    holdModalOrigin(7, episode, card, 1000, screen);
    expect(
      modalOriginFor(7, { episodeNumber: 3, seasonNumber: 1 }, 1100, screen),
    ).toBeNull();
    holdModalOrigin(7, episode, card, 1000, screen);
    expect(modalOriginFor(8, episode, 1100, screen)).toBeNull();
  });

  it('not once the open came too late to start where the finger was', () => {
    holdModalOrigin(7, episode, card, 1000, screen);
    expect(modalOriginFor(7, episode, 4001, screen)).toBeNull();
  });

  it('not after the window changed size', () => {
    holdModalOrigin(7, episode, card, 1000, screen);
    expect(
      modalOriginFor(7, episode, 1100, { height: 900, width: 1200 }),
    ).toBeNull();
  });
});
