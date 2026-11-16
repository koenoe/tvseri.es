import { describe, expect, it } from 'vitest';

import { pathTitle, roleLine } from './copy';

describe('pathTitle', () => {
  it('names the two ends and the two steps', () => {
    expect(pathTitle('Malcolm in the Middle', 'Better Call Saul')).toBe(
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    );
  });
});

describe('roleLine', () => {
  it('joins two different roles', () => {
    expect(roleLine(['Hal', 'Walter White'])).toBe('Hal · Walter White');
  });

  it('says "in both" for the same role', () => {
    expect(roleLine(['Saul Goodman', 'Saul Goodman'])).toBe(
      'Saul Goodman, in both',
    );
    expect(roleLine(['Gus Fring', ' gus fring '])).toBe('Gus Fring, in both');
  });

  it('keeps what it has', () => {
    expect(roleLine(['Hal', ''])).toBe('Hal');
    expect(roleLine(['', 'Walter White'])).toBe('Walter White');
    expect(roleLine([])).toBe('');
  });
});
