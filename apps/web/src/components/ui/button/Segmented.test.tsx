// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Segmented, SegmentedItem } from './Segmented';

/** Each choice's box within the group (jsdom lays nothing out) */
const BOXES: Readonly<Record<string, { left: number; width: number }>> = {
  a: { left: 4, width: 60 },
  b: { left: 66, width: 120 },
};

function Switch({ on }: Readonly<{ on: 'a' | 'b' }>) {
  return (
    <Segmented label="Pick">
      <SegmentedItem data-choice="a" pressed={on === 'a'}>
        A
      </SegmentedItem>
      <SegmentedItem data-choice="b" pressed={on === 'b'}>
        B
      </SegmentedItem>
    </Segmented>
  );
}

const animate = vi.fn();

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

const box = (element: HTMLElement) => BOXES[element.dataset.choice ?? ''];

beforeEach(() => {
  animate.mockReset();
  reducedMotion(false);
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return box(this)?.left ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return box(this)?.width ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 30,
  });
  HTMLElement.prototype.animate = animate;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Segmented', () => {
  it('draws the pressed fill in place on the first render', () => {
    render(<Switch on="a" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides the fill from the old choice to the new one', () => {
    const { rerender } = render(<Switch on="a" />);
    rerender(<Switch on="b" />);
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-62px) scaleX(0.5)',
    );
    expect(options).toMatchObject({ duration: 240, pseudoElement: '::before' });
  });

  it('keeps the corners round while the fill is scaled', () => {
    // a full pill (`rounded-full`) rests at half its height
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      borderTopLeftRadius: '9999px',
    } as CSSStyleDeclaration);
    const { rerender } = render(<Switch on="a" />);
    rerender(<Switch on="b" />);
    const [frames] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.borderRadius).toBe('30px / 15px');
  });

  it('pressed again mid-glide, glides on from where the fill is drawn', () => {
    const first = {
      cancel: vi.fn(),
      effect: { getComputedTiming: () => ({ progress: 0.5 }) },
      playState: 'running',
    };
    animate.mockReturnValueOnce(first);
    const { rerender } = render(<Switch on="a" />);
    rerender(<Switch on="b" />);
    // halfway from a (4, 60) to b (66, 120): the fill is drawn at 35, 90 wide
    rerender(<Switch on="a" />);
    expect(first.cancel).toHaveBeenCalled();
    const [frames] = animate.mock.calls[1] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(31px) scaleX(1.5)',
    );
  });

  it('jumps with reduced motion', () => {
    reducedMotion(true);
    const { rerender } = render(<Switch on="a" />);
    rerender(<Switch on="b" />);
    expect(animate).not.toHaveBeenCalled();
  });
});
