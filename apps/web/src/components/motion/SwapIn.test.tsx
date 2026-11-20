// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SwapIn from './SwapIn';

// Without LazyMotion nothing animates, so a node keeps the style it starts
// from, which is what these read

const itemOf = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('div')).find(
    (node) => node.textContent === text && node.children.length === 0,
  ) as HTMLElement;

describe('SwapIn', () => {
  it('plays nothing on the first render: arriving is the header’s', () => {
    const { container } = render(<SwapIn swapKey="idle">Connect</SwapIn>);
    expect(itemOf(container, 'Connect').style.opacity).not.toBe('0');
  });

  it('starts the new body from its rise once the key changes, the old one gone at once', () => {
    const { container, rerender } = render(
      <SwapIn swapKey="linked">Body</SwapIn>,
    );
    rerender(<SwapIn swapKey="idle">Connect</SwapIn>);
    const item = itemOf(container, 'Connect');
    expect(item.style.opacity).toBe('0');
    expect(item.style.transform).toContain('translateY(6px)');
    // it never holds the card open
    expect(container.textContent).toBe('Connect');
  });
});
