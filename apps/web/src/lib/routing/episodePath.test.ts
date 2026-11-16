import { describe, expect, it } from 'vitest';

import episodePath from './episodePath';
import showPath from './showPath';

describe('episodePath', () => {
  it('opens the episode on the show page', () => {
    expect(episodePath(showPath(136315, 'the-bear'), 2, 4)).toBe(
      '/136315/the-bear?season=2&episode=4',
    );
  });
});
