import { describe, expect, it } from 'vitest';

import { heroShade } from '@/components/background/heroShade';

import { phoneHeroShade } from './PhoneBackdrop';

describe('phoneHeroShade', () => {
  it('lays the dark top fade and the fade to the page colour over the heroes’ shade', () => {
    expect(phoneHeroShade('#102030').background).toBe(
      `linear-gradient(180deg, rgba(20,17,13,0.65) 0px, rgba(20,17,13,0.5) 82px, rgba(20,17,13,0) 200px), linear-gradient(0deg, rgb(16,32,48) 0px, rgba(16,32,48,0.85) 50px, rgba(16,32,48,0.45) 100px, rgba(16,32,48,0) 150px), ${heroShade('#102030')}`,
    );
  });
});
