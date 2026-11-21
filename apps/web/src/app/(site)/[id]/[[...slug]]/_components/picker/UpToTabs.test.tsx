// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpToTabs } from './UpToParts';

/** Seasons 1 and 2 on the first line, 3 wrapped onto the next */
const BOXES: Readonly<Record<string, { left: number; top: number }>> = {
  'Season 1': { left: 4, top: 4 },
  'Season 2': { left: 100, top: 4 },
  'Season 3': { left: 4, top: 38 },
};

const animate = vi.fn();

const noop = () => undefined;

const boxOf = (element: HTMLElement) => BOXES[element.textContent ?? ''];

beforeEach(() => {
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return boxOf(this)?.left ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return boxOf(this)?.top ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 92,
  });
  HTMLElement.prototype.animate = animate;
});

const SEASONS = [1, 2, 3].map((seasonNumber) => ({
  seasonNumber,
  state: '' as const,
}));

const tabs = (tab: number) => (
  <UpToTabs onPick={noop} seasons={SEASONS} tab={tab} />
);

describe('the Up to dialog’s season tabs', () => {
  it('draw the open season’s fill in place', () => {
    render(tabs(1));
    const open = screen.getByRole('tab', { name: 'Season 1' });
    expect(open.getAttribute('aria-selected')).toBe('true');
    expect(animate).not.toHaveBeenCalled();
  });

  it('glide the fill along a line', () => {
    const { rerender } = render(tabs(1));
    rerender(tabs(2));
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-96px) scaleX(1)',
    );
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });

  it('jump to a season on another line', () => {
    const { rerender } = render(tabs(1));
    rerender(tabs(3));
    expect(animate).not.toHaveBeenCalled();
  });
});
