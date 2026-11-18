import { describe, expect, it } from 'vitest';

import { isOver, isRunning } from './status';

const RUNNING = ['Returning Series', 'In Production', 'Planned', 'Pilot'];
const OVER = ['Ended', 'Canceled'];

describe('isOver', () => {
  it('is true for Ended and Canceled', () => {
    for (const status of OVER) {
      expect(isOver(status)).toBe(true);
    }
  });

  it('is false for every show that may still make episodes', () => {
    for (const status of [...RUNNING, '']) {
      expect(isOver(status)).toBe(false);
    }
  });
});

describe('isRunning', () => {
  it('is true while the show is still being made', () => {
    for (const status of RUNNING) {
      expect(isRunning(status)).toBe(true);
    }
  });

  it('is false for an ended show and an unknown status', () => {
    for (const status of [...OVER, '']) {
      expect(isRunning(status)).toBe(false);
    }
  });

  it('leaves an unknown status in neither group', () => {
    expect(isOver('Rumoured')).toBe(false);
    expect(isRunning('Rumoured')).toBe(false);
  });
});
