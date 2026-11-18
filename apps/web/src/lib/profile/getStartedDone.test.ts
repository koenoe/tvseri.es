import { describe, expect, it } from 'vitest';

import { isGetStartedDone } from './getStartedDone';

describe('isGetStartedDone', () => {
  it('is open while a step is left and the API shows it', () => {
    expect(isGetStartedDone({ doneCount: 0, hidden: false })).toBe(false);
    expect(isGetStartedDone({ doneCount: 2, hidden: false })).toBe(false);
  });

  it('is done with all three steps, before the API hides it', () => {
    expect(isGetStartedDone({ doneCount: 3, hidden: false })).toBe(true);
  });

  it('is done once the API hides it', () => {
    expect(isGetStartedDone({ doneCount: 1, hidden: true })).toBe(true);
  });
});
