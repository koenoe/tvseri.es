// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CrossFade from './CrossFade';
import { returnFocusToCopy } from './crossFadeFocus';
import MotionProvider from './MotionProvider';

const itemOf = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('div')).find(
    (node) => node.textContent === text && node.children.length === 0,
  ) as HTMLElement;

/** The exit needs Motion's features */
const shown = (swapKey: string, text: string) => (
  <MotionProvider>
    <CrossFade frame="flex-1" swapKey={swapKey}>
      {text}
    </CrossFade>
  </MotionProvider>
);

describe('CrossFade', () => {
  it('plays nothing on the first render', () => {
    const { container } = render(shown('none', 'Not connected'));
    expect(itemOf(container, 'Not connected').style.opacity).not.toBe('0');
  });

  it('keeps the old line in the same cell, out of reach while it fades', () => {
    const { container, rerender } = render(shown('none', 'Not connected'));
    rerender(shown('wait', 'Waiting'));
    const leaving = itemOf(container, 'Not connected');
    expect(leaving.getAttribute('aria-hidden')).toBe('true');
    expect(leaving.hasAttribute('inert')).toBe(true);
    const arriving = itemOf(container, 'Waiting');
    expect(arriving.className).toContain('row-start-1');
    expect(arriving.hasAttribute('inert')).toBe(false);
    // the stack takes its place in the parent
    expect(arriving.parentElement?.className).toContain('flex-1');
  });

  it('hands focus held in the leaving copy to the same control in the new one', () => {
    const card = (show: string) => (
      <MotionProvider>
        <CrossFade swapKey={show}>
          <a href={`/${show}`}>{show}</a>
          <button type="button">More for {show}</button>
        </CrossFade>
      </MotionProvider>
    );
    const { rerender } = render(card('dark'));
    screen.getByRole('button', { name: 'More for dark' }).focus();
    rerender(card('severance'));
    expect(document.activeElement?.textContent).toBe('More for severance');
  });

  it('leaves focus alone when it was elsewhere', () => {
    const { rerender } = render(
      <>
        <button type="button">Outside</button>
        {shown('none', 'Not connected')}
      </>,
    );
    screen.getByRole('button', { name: 'Outside' }).focus();
    rerender(
      <>
        <button type="button">Outside</button>
        {shown('wait', 'Waiting')}
      </>,
    );
    expect(document.activeElement?.textContent).toBe('Outside');
  });

  it('gives an overlay’s focus back to the new copy when its trigger has left', () => {
    const card = (show: string) => (
      <MotionProvider>
        <CrossFade swapKey={show}>
          <button type="button">More for {show}</button>
        </CrossFade>
      </MotionProvider>
    );
    const { rerender } = render(card('dark'));
    const trigger = screen.getByRole('button', { name: 'More for dark' });
    // the menu holds focus while the card swaps under it
    rerender(card('severance'));
    expect(returnFocusToCopy(trigger, true)).toBe(true);
    expect(document.activeElement?.textContent).toBe('More for severance');
  });
});
