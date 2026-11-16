import { describe, expect, it } from 'vitest';

import profileFromPath from './profileFromPath';

describe('profileFromPath', () => {
  it('finds the profile owner on any /u page', () => {
    expect(profileFromPath('/u/maria')).toBe('maria');
    expect(profileFromPath('/u/maria/')).toBe('maria');
    expect(profileFromPath('/u/maria/history')).toBe('maria');
  });

  it('decodes the username', () => {
    expect(profileFromPath('/u/r%C3%A9my')).toBe('rémy');
  });

  it('is null anywhere else', () => {
    expect(profileFromPath('/settings/profile')).toBeNull();
    expect(profileFromPath('/u')).toBeNull();
    expect(profileFromPath('/u/')).toBeNull();
    expect(profileFromPath('/user/maria')).toBeNull();
    expect(profileFromPath('/u/%E0%A4%A')).toBeNull();
  });
});
