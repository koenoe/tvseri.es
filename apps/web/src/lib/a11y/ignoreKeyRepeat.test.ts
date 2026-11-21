import { describe, expect, it } from 'vitest';

import { ignoreKeyRepeat } from './ignoreKeyRepeat';

const press = (key: string, repeat: boolean) => {
  let prevented = false;
  ignoreKeyRepeat({
    key,
    preventDefault: () => {
      prevented = true;
    },
    repeat,
  });
  return prevented;
};

describe('ignoreKeyRepeat', () => {
  it('stops a held Enter from pressing again', () => {
    expect(press('Enter', true)).toBe(true);
  });

  it('lets the first Enter press', () => {
    expect(press('Enter', false)).toBe(false);
  });

  it('leaves other held keys alone (Tab, arrows)', () => {
    expect(press('Tab', true)).toBe(false);
    expect(press('ArrowDown', true)).toBe(false);
  });
});
