import { describe, expect, it } from 'vitest';

import { statusFact, statusLabel } from './status';

describe('statusLabel', () => {
  it('words the TMDB statuses, the same on every page', () => {
    expect(statusLabel('Returning Series')).toBe('Returning');
    expect(statusLabel('Returning Series', 1)).toBe('S02 renewed');
    expect(statusLabel('Ended')).toBe('Ended');
    expect(statusLabel('Canceled')).toBe('Cancelled');
    for (const status of ['Planned', 'Pilot', 'In Production']) {
      expect(statusLabel(status)).toBe('In production');
    }
  });

  it('shows an unknown status as TMDB has it', () => {
    expect(statusLabel('Something New')).toBe('Something New');
  });
});

describe('statusFact', () => {
  it('pairs the words with ended or ongoing', () => {
    expect(statusFact('Ended')).toEqual({ kind: 'ended', text: 'Ended' });
    expect(statusFact('Canceled')).toEqual({
      kind: 'ended',
      text: 'Cancelled',
    });
    expect(statusFact('Returning Series', 2)).toEqual({
      kind: 'ongoing',
      text: 'S03 renewed',
    });
    expect(statusFact('Planned')).toEqual({
      kind: 'ongoing',
      text: 'In production',
    });
  });

  it('is null without a status', () => {
    expect(statusFact('')).toBeNull();
  });

  it('reads a status it has no words for as ended, as the series years do', () => {
    expect(statusFact('Rumoured')).toEqual({ kind: 'ended', text: 'Rumoured' });
  });
});
