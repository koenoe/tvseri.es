import { describe, expect, it } from 'vitest';

import { buttonStyles } from './buttonStyles';

const classes = (value: string) => value.split(' ');

describe('buttonStyles', () => {
  // callers tint a variant per place; their class must not lose to it
  it('lets className win over a variant class', () => {
    const list = classes(
      buttonStyles({ className: 'border-cyan/60', variant: 'glass' }),
    );
    expect(list).toContain('border-cyan/60');
    expect(list).not.toContain('border-white/20');
  });
});
