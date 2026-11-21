// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SHEET_EASE } from './ease';
import MotionProvider from './MotionProvider';
import PageSlide, { PAGE_HEAD, PAGE_SLIDE } from './PageSlide';

afterEach(cleanup);

type Resolver = (direction: number) => unknown;

const page = (pageKey: string, direction: number) => (
  <MotionProvider>
    <PageSlide className="grid" direction={direction} pageKey={pageKey}>
      {pageKey}
    </PageSlide>
  </MotionProvider>
);

describe('a page that slides the way you travel (the calendar’s month)', () => {
  it('enters 40px from that side over 280ms and leaves 40px the other way in 200ms', () => {
    expect((PAGE_SLIDE.enter as Resolver)(1)).toEqual({ opacity: 0, x: 40 });
    expect((PAGE_SLIDE.enter as Resolver)(-1)).toEqual({ opacity: 0, x: -40 });
    expect(PAGE_SLIDE.center).toEqual({
      opacity: 1,
      transition: { duration: 0.28, ease: SHEET_EASE },
      x: 0,
    });
    expect((PAGE_SLIDE.exit as Resolver)(1)).toEqual({
      opacity: 0,
      transition: { duration: 0.2, ease: SHEET_EASE },
      x: -40,
    });
  });

  it('its heading moves 10px up or down instead, and leaves 6px in 140ms', () => {
    expect((PAGE_HEAD.enter as Resolver)(1)).toEqual({ opacity: 0, y: 10 });
    expect(PAGE_HEAD.center).toEqual({
      opacity: 1,
      transition: { duration: 0.24, ease: SHEET_EASE },
      y: 0,
    });
    expect((PAGE_HEAD.exit as Resolver)(-1)).toEqual({
      opacity: 0,
      transition: { duration: 0.14, ease: 'easeOut' },
      y: 6,
    });
  });

  it('draws the first page still', () => {
    render(page('March', 0));
    expect(screen.getByText('March').style.opacity).not.toBe('0');
  });

  it('keeps the page before where it stood, out of reach, while the next arrives', () => {
    const { rerender } = render(page('March', 0));
    rerender(page('April', 1));
    const leaving = screen.getByText('March');
    expect(leaving.getAttribute('aria-hidden')).toBe('true');
    expect(leaving.className).toContain('pointer-events-none');
    const arriving = screen.getByText('April');
    expect(arriving.getAttribute('aria-hidden')).toBe(null);
    expect(arriving.className).toBe('grid');
  });
});
