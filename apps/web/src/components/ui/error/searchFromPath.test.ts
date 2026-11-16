import { describe, expect, it } from 'vitest';

import { searchFromPath } from './searchFromPath';

describe('searchFromPath', () => {
  it('prefills the last segment with letters, as words', () => {
    expect(searchFromPath('/shows/breaking-bad')).toBe('breaking bad');
    expect(searchFromPath('/tv/1396/the_bear')).toBe('the bear');
    expect(searchFromPath('/person/bryan-cranston')).toBe('bryan cranston');
  });

  it('is empty when the path has no words', () => {
    expect(searchFromPath('/12345/')).toBe('');
    expect(searchFromPath('/')).toBe('');
  });

  it('is empty for profile and settings URLs, which never name a show', () => {
    expect(searchFromPath('/u/no-such-user/stats/2025')).toBe('');
    expect(searchFromPath('/u/no-such-user')).toBe('');
    expect(searchFromPath('/settings/nothing-here')).toBe('');
  });

  it('decodes the segment and survives a malformed escape', () => {
    expect(searchFromPath('/shows/caf%C3%A9-society')).toBe('café society');
    // an escape that doesn't decode is no words: nothing to search
    expect(searchFromPath('/%E0%A4%A')).toBe('');
    expect(searchFromPath('/shows/%E0%A4%A')).toBe('shows');
  });
});
