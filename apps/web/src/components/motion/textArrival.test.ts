import { describe, expect, it } from 'vitest';

import {
  TEXT_ARRIVAL,
  TEXT_ARRIVAL_GROUP,
  TEXT_ARRIVAL_VARIANTS,
  textArrival,
} from './textArrival';

const tokens = (classes: string) => classes.split(/\s+/).filter(Boolean);

/** The classes that apply under a variant prefix, without it */
const under = (classes: string, prefix: string) =>
  tokens(classes)
    .filter((token) => token.startsWith(prefix))
    .map((token) => token.slice(prefix.length))
    .sort();

const plain = (classes: string) =>
  tokens(classes)
    .filter((token) => !token.includes(':'))
    .sort();

describe('text arriving behind its picture (the favourites accordion’s values)', () => {
  it('fades and rises over 300ms on the default curve', () => {
    expect(plain(TEXT_ARRIVAL)).toEqual([
      'duration-300',
      'transition-[opacity,translate]',
    ]);
  });

  it('waits 6px down and transparent while its item is not shown', () => {
    expect(under(TEXT_ARRIVAL, 'group-data-[shown=false]/arrival:')).toEqual([
      'opacity-0',
      'translate-y-1.5',
    ]);
  });

  it('arrives 150ms behind the picture; leaving is at once', () => {
    expect(under(TEXT_ARRIVAL, 'group-data-[shown=true]/arrival:')).toEqual([
      'delay-150',
    ]);
  });

  it('is read from the layer that says whether its item is shown', () => {
    expect(TEXT_ARRIVAL_GROUP).toBe('group/arrival');
  });

  it('on an element that knows its own state, the same values', () => {
    expect(tokens(textArrival(true)).sort()).toEqual(
      [...plain(TEXT_ARRIVAL), 'delay-150'].sort(),
    );
    expect(tokens(textArrival(false)).sort()).toEqual(
      [...plain(TEXT_ARRIVAL), 'opacity-0', 'translate-y-1.5'].sort(),
    );
  });

  it('in Motion, for text replaced in place: the same rise, wait and pace', () => {
    expect(TEXT_ARRIVAL_VARIANTS.from).toEqual({ opacity: 0, y: 6 });
    expect(TEXT_ARRIVAL_VARIANTS.in).toEqual({
      opacity: 1,
      transition: { delay: 0.15, duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      y: 0,
    });
    expect(TEXT_ARRIVAL_VARIANTS.out).toEqual({
      opacity: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      y: 6,
    });
  });
});
