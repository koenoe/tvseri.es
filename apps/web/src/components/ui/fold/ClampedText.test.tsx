// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ClampedText, { guessToggleClass } from './ClampedText';

/** The clamped box's heights (jsdom has no layout) */
let heights = { client: 66, scroll: 66 };
let resize: () => void = () => {};

beforeEach(() => {
  heights = { client: 66, scroll: 66 };
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
    expect(text.className).toContain('line-clamp-3');
  });

  it('opens with More and closes with Less', () => {
    heights.scroll = 140;
    render(<ClampedText fit={FIT} text={LONG} textClassName="" />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    const less = screen.getByRole('button', { name: 'Less' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(LONG).className).not.toContain('line-clamp-3');
    fireEvent.click(less);
    expect(screen.getByText(LONG).className).toContain('line-clamp-3');
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
    expect(screen.getByText(LONG).className).toContain('line-clamp-3');
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
