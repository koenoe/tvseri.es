// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  NARUTO,
  NARUTO_RUNTIMES,
  ONE_SEASON_RUNTIMES,
  oneSeason,
} from './fixtures';
import { LineFacts, LinePercent, SizeFacts } from './ProgressCaption';
import ProgressLineLayout from './ProgressLineLayout';
import { progressLine } from './progressLine';

const naruto = progressLine(NARUTO, {
  nextAirDate: null,
  runtimes: NARUTO_RUNTIMES,
});

const factsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-fact]')].map(
    (item) => item.textContent,
  );

describe('LineFacts: one line, the same words at every width', () => {
  it('each fact carries its "·" before it; the first one\'s goes under the bar on a phone', () => {
    const { container } = render(<LineFacts line={naruto} />);
    expect(factsOf(container)).toEqual([
      '·312 watched',
      '·68 skipped',
      '·46h left',
    ]);
    const first = container.querySelector('[data-fact] > span');
    expect(first?.className).toMatch(/@max-md:hidden/);
    // no viewport rule hides words: only the container query moves the "·"
    expect(container.innerHTML).not.toMatch(/[^@]max-md:hidden|max-sm:hidden/);
  });

  it('never wraps: a fact that does not fit goes out of sight from the end, the airing date first', () => {
    const airing = progressLine(
      oneSeason({ aired: 18, total: 24 }, 'wwwwwwwwwwwwss'),
      { nextAirDate: '2026-11-20', runtimes: ONE_SEASON_RUNTIMES },
    );
    const { container } = render(<LineFacts line={airing} />);
    const row = container.firstElementChild;
    expect(row?.className).toMatch(/h-5/);
    expect(row?.className).toMatch(/flex-wrap/);
    expect(row?.className).toMatch(/overflow-hidden/);
    expect(factsOf(container).at(-1)).toBe('·next Fri Nov 20');
  });

  it('the % stands apart: "76%"', () => {
    const { container } = render(<LinePercent line={naruto} />);
    expect(container.textContent).toBe('76%');
  });

  it('signed out, the size leads with no "·"', () => {
    const { container } = render(
      <SizeFacts facts={['47 episodes', '26h 51m in all']} />,
    );
    expect(factsOf(container)).toEqual(['47 episodes', '·26h 51m in all']);
  });
});

describe('ProgressLineLayout (one rule for the hero, the sheet and the placeholder)', () => {
  it('one row; under 28rem the facts and the chevron take the next row, the % stays by the bar', () => {
    const { container } = render(
      <ProgressLineLayout end="›" facts="facts" percent="76%" track={<i />} />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toMatch(/@container/);
    const row = root?.firstElementChild;
    expect(row?.className).toMatch(/@max-md:flex-wrap/);
    const [, percent, line] = [...(row?.children ?? [])];
    expect(percent?.textContent).toBe('76%');
    expect(line?.className).toMatch(/@max-md:basis-full/);
    expect(line?.textContent).toBe('facts›');
  });
});
