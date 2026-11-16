import { describe, expect, it } from 'vitest';

import { heroShade } from '@/components/background/heroShade';

import { phoneHeroShade } from './PhoneBackdrop';

describe('phoneHeroShade', () => {
  it('lays sh1 with its 60% top stop over the hero shade', () => {
    expect(phoneHeroShade('#102030').background).toBe(
      `linear-gradient(0deg, rgb(16,32,48) 0%, rgba(16,32,48,0.3) 55%, rgba(16,32,48,0.6) 100%), ${heroShade('#102030')}`,
    );
  });
});
