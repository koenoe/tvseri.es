// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';

import EyePill, { type PillVariant } from './EyePill';
import type { EpisodeMark } from './marks';
import { record, season } from './testData';

const episode = { ...season(3, 5)[4]!, title: 'Children' };

function pill(
  mark: EpisodeMark,
  variant: PillVariant,
  watchedAt = Date.UTC(2025, 6, 5, 22),
) {
  render(
    <MarkingProvider>
      <EyePill
        episode={episode}
        mark={mark}
        record={
          mark === 'watched' || mark === 'unknown'
            ? record(watchedAt, mark === 'unknown')
            : undefined
        }
        seriesId={1}
        variant={variant}
      />
    </MarkingProvider>,
  );
  const button = screen.getByRole('button');
  const visible = button.querySelector('span')?.textContent ?? '';
  return { button, name: button.getAttribute('aria-label') ?? '', visible };
}

describe('EyePill', () => {
  it.each([
    ['next', 'primary', 'Mark S03E05 watched', 'Mark S03E05 watched, Children'],
    ['open', 'tile', 'Mark watched', 'Mark watched, S03E05 Children'],
    ['watched', 'tile', 'Jul 5, 2025', 'Jul 5, 2025: unmark S03E05 Children'],
    ['unknown', 'tile', 'Watched', 'Watched: unmark S03E05 Children'],
    ['skipped', 'compact', 'Skipped', 'Skipped, S03E05 Children'],
  ] as const)(
    '%s (%s): the name starts with the visible text',
    (mark, variant, text, name) => {
      const result = pill(mark, variant);
      expect(result.visible).toBe(text);
      expect(result.name).toBe(name);
      expect(result.button.hasAttribute('title')).toBe(false);
    },
  );

  it('follows watched with aria-pressed', () => {
    expect(pill('watched', 'tile').button.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('keeps the site’s focus ring and never dims the border on focus', () => {
    const { button } = pill('watched', 'tile');
    const classes = button.className.split(' ');
    expect(
      classes.filter((c) => c.startsWith('focus-visible:outline')),
    ).toEqual([]);
    expect(classes).not.toContain('focus-visible:border-white/45');
  });
});
