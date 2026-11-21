// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Pager, { type PagerHandle } from './Pager';

const TITLES = ['A', 'B', 'C', 'D', 'E', 'F'];

const animate = vi.fn();

const noop = () => undefined;

/** How far the running countdown has drawn its line (0 to 1) */
let countdownAt = 0;

function reducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches,
      removeEventListener: () => undefined,
    })),
  );
}

beforeEach(() => {
  countdownAt = 0;
  animate.mockReset();
  animate.mockImplementation(() => ({ cancel: () => undefined }));
  reducedMotion(false);
  HTMLElement.prototype.animate = animate;
  // jsdom draws nothing: a static line is full or empty by its class, the
  // countdown is where the test puts it
  const real = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = real(element);
    if (element.tagName !== 'I') {
      return style;
    }
    const fill = element.hasAttribute('data-line-fill');
    const empty = (element.getAttribute('class') ?? '').includes('scaleX(0)');
    const scale = fill ? (empty ? 0 : 1) : countdownAt;
    return {
      ...style,
      transform: `matrix(${scale}, 0, 0, 1, 0, 0)`,
    } as CSSStyleDeclaration;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function pager(current: number, pending = false, ref?: React.Ref<PagerHandle>) {
  return (
    <Pager
      countdownKey={`${current}-0`}
      current={current}
      hydrated
      onCountdownEnd={noop}
      onCountdownStart={noop}
      onIntent={noop}
      onSelect={noop}
      onTogglePlay={noop}
      pending={pending}
      ref={ref}
      running
      titles={TITLES}
      userChose={false}
      userPaused={false}
    />
  );
}

const line = (index: number) =>
  screen.getByRole('button', { name: new RegExp(`^${index + 1} of`) });

/** Each sweep, by the line it runs on: its keyframes */
function sweeps() {
  return new Map(
    animate.mock.calls.map(([frames], call) => {
      const fill = animate.mock.contexts[call] as HTMLElement;
      const index = Number(
        fill.closest<HTMLElement>('[data-index]')?.dataset.index,
      );
      const keyframes = (frames as Keyframe[]).map(
        (frame) => `${frame.offset} ${frame.transform}`,
      );
      return [index, { fill, keyframes }] as const;
    }),
  );
}

describe('Pager', () => {
  it('a swipe sweeps the lines like a press', () => {
    countdownAt = 0.5;
    const handle = createRef<PagerHandle>();
    const { rerender } = render(pager(1, false, handle));
    act(() => handle.current?.sweepTo(2));
    rerender(pager(2, false, handle));
    // the old line fills from where its countdown had drawn
    expect(sweeps().get(1)?.keyframes).toEqual([
      '0 scaleX(0.5)',
      '0 scaleX(0.5)',
      '1 scaleX(1)',
      '1 scaleX(1)',
    ]);
  });

  it('draws the lines in place on the first render', () => {
    render(pager(1));
    expect(animate).not.toHaveBeenCalled();
  });

  it('a press forward fills the lines up to the pressed one, from where the old line had drawn', () => {
    countdownAt = 0.5;
    const { rerender } = render(pager(1));
    fireEvent.click(line(4));
    rerender(pager(4));
    const drawn = sweeps();
    // one front across 2.5 lines: 1 has half to go, 2 and 3 a whole line
    expect([...drawn.keys()].sort()).toEqual([1, 2, 3]);
    expect(drawn.get(1)?.keyframes).toEqual([
      '0 scaleX(0.5)',
      '0 scaleX(0.5)',
      '0.2 scaleX(1)',
      '1 scaleX(1)',
    ]);
    expect(drawn.get(2)?.keyframes).toEqual([
      '0 scaleX(0)',
      '0.2 scaleX(0)',
      '0.6 scaleX(1)',
      '1 scaleX(1)',
    ]);
    expect(drawn.get(3)?.keyframes).toEqual([
      '0 scaleX(0)',
      '0.6 scaleX(0)',
      '1 scaleX(1)',
      '1 scaleX(1)',
    ]);
    const [, options] = animate.mock.calls[0] ?? [];
    expect(options).toMatchObject({ duration: 240 });
  });

  it('a press back empties the lines after the pressed one, the old line from its partial fill', () => {
    countdownAt = 0.25;
    const { rerender } = render(pager(4));
    fireEvent.click(line(1));
    rerender(pager(1));
    const drawn = sweeps();
    // the front runs back from 4.25: line 4 first, then 3, then 2
    expect([...drawn.keys()].sort()).toEqual([2, 3, 4]);
    expect(drawn.get(4)?.keyframes).toEqual([
      '0 scaleX(0.25)',
      '0 scaleX(0.25)',
      `${0.25 / 2.25} scaleX(0)`,
      '1 scaleX(0)',
    ]);
    expect(drawn.get(2)?.keyframes).toEqual([
      '0 scaleX(1)',
      `${1.25 / 2.25} scaleX(1)`,
      '1 scaleX(0)',
      '1 scaleX(0)',
    ]);
  });

  it('never touches the running countdown line', () => {
    const { rerender } = render(pager(1));
    fireEvent.click(line(4));
    rerender(pager(4));
    for (const { fill } of sweeps().values()) {
      expect(fill.hasAttribute('data-line-fill')).toBe(true);
    }
    expect(sweeps().has(4)).toBe(false);
  });

  it('autoplay moves on without a sweep', () => {
    const { rerender } = render(pager(1));
    rerender(pager(2));
    expect(animate).not.toHaveBeenCalled();
  });

  it('a press on the line on leaves the next autoplay still', () => {
    const { rerender } = render(pager(1));
    fireEvent.click(line(1));
    rerender(pager(2));
    expect(animate).not.toHaveBeenCalled();
  });

  it('snaps with reduced motion', () => {
    reducedMotion(true);
    const { rerender } = render(pager(1));
    fireEvent.click(line(4));
    rerender(pager(4));
    expect(animate).not.toHaveBeenCalled();
  });

  it('holds the pressed line still until its slide shows, then starts its countdown once', () => {
    const { container, rerender } = render(pager(1));
    const countdowns = () =>
      container.querySelectorAll('i:not([data-line-fill])').length;
    expect(countdowns()).toBe(1);
    fireEvent.click(line(4));
    rerender(pager(4, true));
    expect(countdowns()).toBe(0);
    rerender(pager(4));
    expect(countdowns()).toBe(1);
  });
});
