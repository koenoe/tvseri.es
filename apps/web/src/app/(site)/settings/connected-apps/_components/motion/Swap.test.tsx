// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MotionProvider from '@/components/motion/MotionProvider';
import Swap from './Swap';

// Without LazyMotion nothing animates, so a node keeps the style it starts
// from, which is what the first two read

const itemOf = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('div')).find(
    (node) => node.textContent === text && node.children.length === 0,
  ) as HTMLElement;

describe('Swap', () => {
  it('plays nothing on the first render: arriving is the header’s', () => {
    const { container } = render(<Swap swapKey="idle">Connect</Swap>);
    expect(itemOf(container, 'Connect').style.opacity).not.toBe('0');
  });

  it('starts the new stage from its rise once the key changes', () => {
    const { container, rerender } = render(<Swap swapKey="linked">Body</Swap>);
    rerender(<Swap swapKey="idle">Connect</Swap>);
    const item = itemOf(container, 'Connect');
    expect(item.style.opacity).toBe('0');
    expect(item.style.transform).toContain('translateY(6px)');
    // the old stage left at once: it never holds the card open
    expect(container.textContent).toBe('Connect');
  });

  it('stacked, keeps the old line in the same cell, out of reach while it fades', () => {
    // the exit needs Motion's features
    const { container, rerender } = render(
      <MotionProvider>
        <Swap stacked swapKey="none">
          Not connected
        </Swap>
      </MotionProvider>,
    );
    rerender(
      <MotionProvider>
        <Swap stacked swapKey="wait">
          Waiting
        </Swap>
      </MotionProvider>,
    );
    const leaving = itemOf(container, 'Not connected');
    expect(leaving.getAttribute('aria-hidden')).toBe('true');
    expect(leaving.hasAttribute('inert')).toBe(true);
    expect(itemOf(container, 'Waiting').className).toContain('row-start-1');
  });
});
