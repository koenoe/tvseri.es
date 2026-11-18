import { describe, expect, it } from 'vitest';

import { versusAnnouncement } from './copy';

describe('Versus copy', () => {
  it('announces the pair, then the choice', () => {
    expect(versusAnnouncement({ left: 'Dark', right: 'Devs' }, null)).toBe(
      'Dark or Devs',
    );
    expect(versusAnnouncement({ left: 'Dark', right: 'Devs' }, 'right')).toBe(
      'You would start Devs',
    );
  });
});
