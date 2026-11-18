import { describe, expect, it } from 'vitest';

import { phoneHeroShade } from './PhoneBackdrop';

describe('phoneHeroShade', () => {
  it('lays the dark top fade over the fade to the page colour', () => {
    expect(phoneHeroShade('#102030').background).toBe(
      'linear-gradient(180deg, rgba(20,17,13,0.55) 0%, rgba(20,17,13,0) 22%), linear-gradient(0deg, rgb(16,32,48) 0%, rgba(16,32,48,0.75) 30%, rgba(16,32,48,0) 58%)',
    );
  });
});
