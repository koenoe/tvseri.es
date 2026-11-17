import { describe, expect, it } from 'vitest';

import {
  badgeStyles,
  buttonStyles,
  chipStyles,
  circleButtonStyles,
  segmentedItemStyles,
} from './buttonStyles';

const classes = (value: string) => value.split(' ');

describe('buttonStyles', () => {
  it('draws the white primary pill (HMFinal hx-solid, ERFinal er-solid)', () => {
    const list = classes(buttonStyles({ size: 'md', variant: 'primary' }));
    expect(list).toEqual(
      expect.arrayContaining([
        'h-10',
        'rounded-full',
        'border-2',
        'border-white',
        'bg-white',
        'text-[#171717]',
        'hover:bg-white/88',
        'text-body-sm',
        'font-medium',
      ]),
    );
  });

  it('dims a disabled primary to white/20 with white/60 text (EPShowFinal dlg-go)', () => {
    const list = classes(buttonStyles({ variant: 'primary' }));
    expect(list).toEqual(
      expect.arrayContaining([
        'aria-disabled:bg-white/20',
        'aria-disabled:text-white/60',
        'disabled:bg-white/20',
      ]),
    );
  });

  it('draws the outline pill with a 2px white/25 edge (HMFinal hx-btn)', () => {
    const list = classes(buttonStyles({ variant: 'outline' }));
    expect(list).toEqual(
      expect.arrayContaining([
        'border-2',
        'border-white/25',
        'hover:border-white/50',
        'text-white',
      ]),
    );
  });

  it('draws the glass pill for stills (ERFinal er-glass)', () => {
    const list = classes(buttonStyles({ variant: 'glass' }));
    expect(list).toEqual(
      expect.arrayContaining([
        'border-white/20',
        'bg-white/8',
        'backdrop-blur-md',
        'hover:border-white/50',
      ]),
    );
  });

  it('draws the tonal and quiet sheet buttons (EPShowFinal v2-btn, dlg-c)', () => {
    expect(classes(buttonStyles({ variant: 'tonal' }))).toEqual(
      expect.arrayContaining(['bg-white/8', 'hover:bg-white/16']),
    );
    expect(classes(buttonStyles({ variant: 'quiet' }))).toEqual(
      expect.arrayContaining([
        'text-white/80',
        'hover:bg-white/8',
        'hover:text-white',
      ]),
    );
  });

  it.each([
    ['xs', 'h-8'],
    ['sm', 'h-9'],
    ['md', 'h-10'],
    ['lg', 'h-11'],
  ] as const)('sizes %s as %s', (size, height) => {
    expect(classes(buttonStyles({ size }))).toContain(height);
  });

  it('marks a pending button busy at half opacity (HMFinal e2-busy)', () => {
    expect(classes(buttonStyles({}))).toContain('aria-busy:opacity-50');
  });

  it('lets className win over a variant class', () => {
    const list = classes(
      buttonStyles({ className: 'border-cyan/60', variant: 'glass' }),
    );
    expect(list).toContain('border-cyan/60');
    expect(list).not.toContain('border-white/20');
  });
});

describe('circleButtonStyles', () => {
  it('draws the 32px circle with a 2px white/20 ring (EPShowFinal ep-circ)', () => {
    const list = classes(circleButtonStyles({ size: 32 }));
    expect(list).toEqual(
      expect.arrayContaining([
        'size-8',
        'rounded-full',
        'border-2',
        'border-white/20',
        'text-white/80',
        'hover:border-white/45',
        'aria-pressed:border-white',
        'active:scale-94',
        'disabled:opacity-30',
      ]),
    );
  });

  it.each([
    [40, 'size-10'],
    [44, 'size-11'],
    [48, 'size-12'],
  ] as const)('sizes %i as %s', (size, sizeClass) => {
    expect(classes(circleButtonStyles({ size }))).toContain(sizeClass);
  });

  it('puts the glass circle on stills (EPShowFinal ep-tools)', () => {
    expect(classes(circleButtonStyles({ tone: 'glass' }))).toEqual(
      expect.arrayContaining(['bg-black/25', 'backdrop-blur-md']),
    );
  });
});

describe('chipStyles', () => {
  it('draws the keyword chip, white when selected', () => {
    const list = classes(chipStyles({}));
    expect(list).toEqual(
      expect.arrayContaining([
        'h-8',
        'px-3',
        'rounded-full',
        'border-white/5',
        'text-caption',
        'font-medium',
        'hover:border-white/18',
        'aria-pressed:bg-white',
        'aria-pressed:text-black/90',
      ]),
    );
  });

  it('draws the 30px sheet chip (EPShowFinal hu-chip)', () => {
    expect(classes(chipStyles({ variant: 'tonal' }))).toEqual(
      expect.arrayContaining(['h-7.5', 'bg-white/8', 'hover:bg-white/16']),
    );
  });
});

describe('badgeStyles', () => {
  it('draws the New badge as an overline pill (EPShowFinal mk-new)', () => {
    expect(classes(badgeStyles({ variant: 'new' }))).toEqual(
      expect.arrayContaining([
        'h-4.5',
        'rounded-full',
        'bg-white/12',
        'text-overline',
        'uppercase',
        'text-white/80',
      ]),
    );
  });

  it('draws the episode code badge with tabular figures (EPShowFinal ep-badge)', () => {
    expect(classes(badgeStyles({ variant: 'code' }))).toEqual(
      expect.arrayContaining([
        'h-6',
        'min-w-14',
        'rounded-6',
        'bg-white/10',
        'text-caption',
        'tabular-nums',
      ]),
    );
  });
});

describe('segmentedItemStyles', () => {
  it('fills the pressed item white/15', () => {
    expect(classes(segmentedItemStyles())).toEqual(
      expect.arrayContaining([
        'h-7.5',
        'text-white/60',
        'hover:text-white',
        'aria-pressed:bg-white/15',
        'aria-pressed:text-white',
      ]),
    );
  });
});
