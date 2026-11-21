// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { growFromBox } from './growFromBox';

const box = (left: number, top: number, width: number, height: number) =>
  ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  }) as DOMRect;

function element(rect: DOMRect) {
  const el = document.createElement('span');
  el.getBoundingClientRect = () => rect;
  const animate = vi.fn(() => ({}) as Animation);
  el.animate = animate;
  return { animate, el };
}

function motion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: reduced,
      removeEventListener: () => undefined,
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('growFromBox', () => {
  it('opens from the pressed box to its own, as a pill', () => {
    motion(false);
    // the one button spans the pair's row; Seen it was its right half
    const { animate, el } = element(box(100, 50, 300, 40));
    growFromBox(el, box(260, 50, 140, 40));
    const [frames] = animate.mock.calls[0] as unknown as [Keyframe[]];
    expect(frames[0]?.clipPath).toBe('inset(0px 0px 0px 160px round 20px)');
    expect(frames[1]?.clipPath).toBe('inset(0px 0px 0px 0px round 20px)');
  });

  it('does nothing with reduced motion', () => {
    motion(true);
    const { animate, el } = element(box(100, 50, 300, 40));
    expect(growFromBox(el, box(100, 50, 140, 40))).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
