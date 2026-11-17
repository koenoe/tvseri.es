import { describe, expect, it } from 'vitest';

import cn from './cn';

describe('cn', () => {
  it('keeps a type token next to a text colour', () => {
    expect(cn('text-body', 'text-white/80')).toBe('text-body text-white/80');
    expect(cn('text-meta text-white/60')).toBe('text-meta text-white/60');
  });

  it('lets a later type token win over an earlier one', () => {
    expect(cn('text-body-sm', 'text-title-2')).toBe('text-title-2');
    expect(cn('text-numeral-xl', 'text-numeral')).toBe('text-numeral');
  });

  it('lets a later colour win over an earlier one', () => {
    expect(cn('text-white/60', 'text-cyan')).toBe('text-cyan');
    expect(cn('bg-ground', 'bg-page')).toBe('bg-page');
  });

  it('merges the radius tokens', () => {
    expect(cn('rounded-12', 'rounded-16')).toBe('rounded-16');
  });
});
