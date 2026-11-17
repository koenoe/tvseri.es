import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_COLOR, toPageColor } from './pageColor';

describe('toPageColor', () => {
  it('keeps a six-digit hex colour', () => {
    expect(toPageColor('#1a2b3c')).toBe('#1a2b3c');
  });

  it('accepts uppercase hex and lowercases it', () => {
    expect(toPageColor('#1A2B3C')).toBe('#1a2b3c');
  });

  it('uses a valid colour as it is: the API serves it readable, the web corrects nothing', () => {
    // dark grounds and a bright colour alike
    for (const colour of ['#29251f', '#1c2223', '#d9a521', '#ffffff']) {
      expect(toPageColor(colour)).toBe(colour);
    }
  });

  it.each([
    ['a colour name', 'red'],
    ['a style break-out', '#fff;}body{display:none}'],
    ['a closing style tag', '#000000</style><script>alert(1)</script>'],
    ['a url()', 'url(https://evil.example/x.png)'],
    ['a three-digit hex', '#fff'],
    ['an eight-digit hex', '#11223344'],
    ['hex without the hash', '1a2b3c'],
    ['surrounding whitespace', ' #1a2b3c'],
    ['a trailing newline', '#1a2b3c\n'],
    ['an rgb() value', 'rgb(1, 2, 3)'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 0x1a2b3c],
  ])('falls back to the ground for %s', (_, value) => {
    expect(toPageColor(value)).toBe('#1c2223');
  });

  it('defaults to the ground #1c2223', () => {
    expect(DEFAULT_PAGE_COLOR).toBe('#1c2223');
  });
});
