import { describe, expect, it } from 'vitest';

import { doneCount, progressText } from './getStartedCopy';

describe('Get started copy', () => {
  it('counts and words the steps', () => {
    const steps = { alreadySeen: false, history: false, services: true };
    expect(doneCount(steps)).toBe(1);
    expect(progressText(0)).toBe('0 of 3 done');
    expect(progressText(1)).toBe('1 of 3 done');
  });
});
