import { describe, expect, it } from 'vitest';

import { VERSUS_LINE, versusAnnouncement } from './copy';

describe('Versus copy', () => {
  it('says "you haven’t seen either" only to a signed-in viewer', () => {
    expect(VERSUS_LINE.signedIn).toBe(
      'Similar, and you haven’t seen either. Which first?',
    );
    expect(VERSUS_LINE.signedOut).toBe('Similar. Which first?');
  });

  it('announces the pair, then the choice', () => {
    expect(versusAnnouncement({ left: 'Dark', right: 'Devs' }, null)).toBe(
      'Dark or Devs',
    );
    expect(versusAnnouncement({ left: 'Dark', right: 'Devs' }, 'right')).toBe(
      'You would start Devs',
    );
  });
});
