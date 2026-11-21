// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClampedText, { guessToggleClass } from './ClampedText';

/** The clamped box's heights (jsdom has no layout) */
let heights = { client: 66, scroll: 66 };
let resize: () => void = () => {};

/** The text box's height motions (Web Animations), finished by hand */
type Motion = Readonly<{
  frames: PropertyIndexedKeyframes;
  animation: Animation;
}>;
let motions: Motion[] = [];
const finish = (motion: Motion | undefined) =>
  act(() => {
    motion?.animation.onfinish?.call(
      motion.animation,
      new Event('finish') as AnimationPlaybackEvent,
    );
  });

const reduceMotion = (reduced: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: reduced,
      removeEventListener: () => undefined,
    })),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  heights = { client: 66, scroll: 66 };
  motions = [];
  reduceMotion(false);
  HTMLElement.prototype.animate = function animate(frames) {
    const animation = {
      cancel: vi.fn(),
      onfinish: null,
    } as unknown as Animation;
    motions.push({
      animation,
      frames: frames as PropertyIndexedKeyframes,
    });
    return animation;
  };
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    () => heights.client,
  );
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
    () => heights.scroll,
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      disconnect() {}
      observe() {}
    },
  );
});

/** Whether the text is cut to its three lines (jsdom draws no lines: the clamp's class) */
const isClamped = () =>
  screen.getByText(LONG).classList.contains('line-clamp-3');

/** The height a motion starts from */
const startHeight = (motion: Motion | undefined) => {
  const height = motion?.frames.height;
  return Array.isArray(height) ? height[0] : height;
};

const FIT = { base: 120, md: 340 };
const LONG = 'x'.repeat(400);

describe('guessToggleClass', () => {
  it('shows no toggle for a text three lines hold at every width', () => {
    expect(guessToggleClass(100, FIT)).toBeNull();
  });

  it('shows the toggle on phones only for a text desktop holds', () => {
    expect(guessToggleClass(200, FIT)).toBe('md:hidden');
  });

  it('shows the toggle everywhere for a text no width holds', () => {
    expect(guessToggleClass(400, FIT)).toBe('');
  });

  it('uses one threshold without an md one', () => {
    expect(guessToggleClass(121, { base: 120 })).toBe('');
    expect(guessToggleClass(120, { base: 120 })).toBeNull();
  });
});

describe('ClampedText', () => {
  it('server-renders the toggle by the length guess, per breakpoint', () => {
    const medium = renderToString(
      <ClampedText fit={FIT} text={'x'.repeat(200)} textClassName="" />,
    );
    expect(medium).toMatch(/<button[^>]*class="[^"]*md:hidden/);
    const short = renderToString(
      <ClampedText fit={FIT} text="Short." textClassName="" />,
    );
    expect(short).not.toContain('<button');
  });

  it('shows no toggle when the clamp cuts nothing', () => {
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows More, tied to the text, when the clamp cuts it', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    const button = screen.getByRole('button', { name: 'More' });
    const text = screen.getByText(LONG);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(text.id);
    expect(isClamped()).toBe(true);
  });

  it('opens with More and closes with Less', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    const less = screen.getByRole('button', { name: 'Less' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
    // whole from the press on, while it moves open
    expect(isClamped()).toBe(false);
    expect(motions).toHaveLength(1);
    finish(motions[0]);
    fireEvent.click(less);
    finish(motions[1]);
    expect(isClamped()).toBe(true);
  });

  it('stays whole while it shuts, and is clamped once it has', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    finish(motions[0]);
    heights.client = 140;
    fireEvent.click(screen.getByRole('button', { name: 'Less' }));
    // the control says so at once; no line is cut before the box is short
    const more = screen.getByRole('button', { name: 'More' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(motions).toHaveLength(2);
    expect(isClamped()).toBe(false);
    finish(motions[1]);
    expect(isClamped()).toBe(true);
  });

  it('turns back from where it is when pressed while it moves', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    heights.client = 100;
    fireEvent.click(screen.getByRole('button', { name: 'Less' }));
    // the shut starts at the height it had reached, not at its full height
    expect(startHeight(motions[1])).toBe('100px');
    finish(motions[1]);
    expect(isClamped()).toBe(true);
  });

  it('opens and shuts at once with reduced motion', () => {
    reduceMotion(true);
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(isClamped()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Less' }));
    expect(isClamped()).toBe(true);
    expect(motions).toHaveLength(0);
  });

  it('opens on a click on the clamped text', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByText(LONG));
    expect(screen.getByRole('button', { name: 'Less' })).toBeTruthy();
  });

  it('ignores a click on text that fits', () => {
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByText(LONG));
    expect(isClamped()).toBe(true);
  });

  it('drops the toggle when a wider box fits the text', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
    heights.scroll = 66;
    act(() => resize());
    expect(screen.queryByRole('button')).toBeNull();
  });
});
