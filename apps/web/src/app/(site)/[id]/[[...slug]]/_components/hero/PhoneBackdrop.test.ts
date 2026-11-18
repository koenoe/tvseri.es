import { describe, expect, it } from 'vitest';

import { phoneHeroShade } from './PhoneBackdrop';

describe('phoneHeroShade', () => {
  it('lays the dark top fade over the fade to the page colour', () => {
    expect(phoneHeroShade('#102030').background).toBe(
      'linear-gradient(180deg, rgba(20,17,13,0.65) 0%, rgba(20,17,13,0.5) 8%, rgba(20,17,13,0) 24%), linear-gradient(0deg, rgb(16,32,48) 0%, rgba(16,32,48,0.85) 32%, rgba(16,32,48,0.45) 48%, rgba(16,32,48,0) 62%)',
    );
  });
});
