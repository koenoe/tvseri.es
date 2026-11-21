// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import FillRing from './FillRing';
import MotionProvider from './MotionProvider';

afterEach(cleanup);

const ring = (size: 18 | 20) =>
  render(
    <MotionProvider>
      <FillRing className="x" ink="ink" size={size} track="track" />
    </MotionProvider>,
  ).container.querySelector('svg');

describe('the ring that fills once (a tray’s Save, the Remote’s pending key)', () => {
  it('draws a 7px ring centred in its box, hidden from screen readers', () => {
    const svg = ring(18);
    expect(svg?.getAttribute('viewBox')).toBe('0 0 18 18');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    const [track, ink] = Array.from(svg?.querySelectorAll('circle') ?? []);
    expect(track?.getAttribute('class')).toBe('track');
    expect([ink?.getAttribute('cx'), ink?.getAttribute('r')]).toEqual([
      '9',
      '7',
    ]);
    expect(ring(20)?.querySelector('circle')?.getAttribute('cx')).toBe('10');
  });

  it('starts empty: the line round the ring is all gap', () => {
    const ink = ring(20)?.querySelectorAll('circle')[1];
    expect(ink?.getAttribute('stroke-dasharray')).toBe('44');
    expect(ink?.getAttribute('stroke-dashoffset')).toBe('44');
  });
});
