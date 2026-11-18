import { describe, expect, it } from 'vitest';

import { typeAhead } from './typeAhead';

const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
  altKey: false,
  ctrlKey: false,
  isComposing: false,
  key,
  metaKey: false,
  ...modifiers,
});

describe('typeAhead', () => {
  it('adds printable characters, spaces and accents included', () => {
    expect(typeAhead('', press('t'))).toBe('t');
    expect(typeAhead('the', press(' '))).toBe('the ');
    expect(typeAhead('caf', press('é'))).toBe('café');
  });

  it('Backspace takes the last character back', () => {
    expect(typeAhead('thx', press('Backspace'))).toBe('th');
    expect(typeAhead('', press('Backspace'))).toBe('');
  });

  it('leaves shortcuts, named keys and compositions alone', () => {
    expect(typeAhead('a', press('k', { metaKey: true }))).toBeNull();
    expect(typeAhead('a', press('k', { ctrlKey: true }))).toBeNull();
    expect(typeAhead('a', press('Enter'))).toBeNull();
    expect(typeAhead('a', press('Escape'))).toBeNull();
    expect(typeAhead('a', press('ArrowDown'))).toBeNull();
    expect(typeAhead('a', press('e', { isComposing: true }))).toBeNull();
  });
});
