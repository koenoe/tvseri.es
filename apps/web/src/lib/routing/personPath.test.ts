import { describe, expect, it } from 'vitest';

import personPath from './personPath';

describe('personPath', () => {
  it('links to the person with the slug, or the bare id', () => {
    expect(personPath(17419, 'bryan-cranston')).toBe(
      '/person/17419/bryan-cranston',
    );
    expect(personPath(17419)).toBe('/person/17419');
    expect(personPath('17419', '')).toBe('/person/17419');
  });
});
