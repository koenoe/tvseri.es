// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { glideFill, useLinkGlide } from './fillGlide';

/** Each item's box within its group (jsdom lays nothing out) */
const BOXES: Readonly<
  Record<string, { left: number; top: number; width: number }>
> = {
  a: { left: 4, top: 4, width: 60 },
  b: { left: 66, top: 4, width: 120 },
  // wrapped onto the next line
  c: { left: 4, top: 38, width: 80 },
};

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

const box = (element: HTMLElement) => BOXES[element.dataset.item ?? ''];

function measure(key: 'left' | 'top' | 'width') {
  return {
    configurable: true,
    get(this: HTMLElement) {
      return box(this)?.[key] ?? 0;
    },
  };
}

beforeEach(() => {
  animate.mockReset();
  reducedMotion(false);
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', measure('left'));
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', measure('top'));
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', measure('width'));
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 30,
  });
  HTMLElement.prototype.animate = animate;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function group() {
  const row = document.createElement('div');
  const item = (name: string) => {
    const element = document.createElement('button');
    element.dataset.item = name;
    row.append(element);
    return element;
  };
  const items = { a: item('a'), b: item('b'), c: item('c') };
  document.body.append(row);
  return { ...items, row };
}

describe('glideFill', () => {
  it('scales the fill from its left edge, so it starts on the old box', () => {
    const { a, b, row } = group();
    glideFill(row, a, b);
    const [frames] = animate.mock.calls[0] ?? [];
    expect(
      (frames as Keyframe[]).map((frame) => frame.transformOrigin),
    ).toEqual(['left center', 'left center']);
  });

  it('jumps to an item on another line of a wrapping row', () => {
    const { a, c, row } = group();
    glideFill(row, a, c);
    expect(animate).not.toHaveBeenCalled();
  });

  it('a jump to another line ends a glide under way', () => {
    const running = {
      cancel: vi.fn(),
      effect: { getComputedTiming: () => ({ progress: 0.5 }) },
      playState: 'running',
    };
    animate.mockReturnValueOnce(running);
    const { a, b, c, row } = group();
    glideFill(row, a, b);
    glideFill(row, b, c);
    expect(running.cancel).toHaveBeenCalled();
    // back on the first line: from the item, not the cancelled glide's box
    glideFill(row, c, a);
    expect(animate).toHaveBeenCalledTimes(1);
  });
});

const LINKS = ['a', 'b'] as const;

function Row({ active }: Readonly<{ active: string }>) {
  const row = useRef<HTMLDivElement>(null);
  const onPress = useLinkGlide(() => row.current, active);
  return (
    <div ref={row}>
      {LINKS.map((name) => (
        <a
          aria-current={name === active ? 'page' : undefined}
          data-item={name}
          href={`#${name}`}
          key={name}
          onClick={onPress}
        >
          {name}
        </a>
      ))}
    </div>
  );
}

const link = (name: string) => screen.getByText(name);

describe('useLinkGlide', () => {
  it('draws the fill in place on the first render', () => {
    render(<Row active="a" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides after a press, from the link that was current', () => {
    const { rerender } = render(<Row active="a" />);
    fireEvent.click(link('b'));
    rerender(<Row active="b" />);
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-62px) scaleX(0.5)',
    );
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });

  it('puts the fill on its link after Back or Forward', () => {
    const { rerender } = render(<Row active="a" />);
    rerender(<Row active="b" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('a press on the current link leaves the next Back still', () => {
    const { rerender } = render(<Row active="a" />);
    fireEvent.click(link('a'));
    rerender(<Row active="b" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('a press that went nowhere leaves Back still', () => {
    const { rerender } = render(<Row active="a" />);
    fireEvent.click(link('b'));
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    rerender(<Row active="b" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('a click that opens a new tab leaves the row still', () => {
    const { rerender } = render(<Row active="a" />);
    fireEvent.click(link('b'), { metaKey: true });
    rerender(<Row active="b" />);
    expect(animate).not.toHaveBeenCalled();
  });
});
