import { describe, expect, it } from 'vitest';

import { phoneHeroShade } from './PhoneBackdrop';

describe('phoneHeroShade', () => {
  it('lays the dark top fade over the fade to the page colour', () => {
    expect(phoneHeroShade('#102030').background).toBe(
      'linear-gradient(180deg, rgba(20,17,13,0.65) 0px, rgba(20,17,13,0.5) 82px, rgba(20,17,13,0) 245px), linear-gradient(0deg, rgb(16,32,48) 0px, rgba(16,32,48,0.85) 326px, rgba(16,32,48,0.45) 490px, rgba(16,32,48,0) 632px)',
    );
  });
});
