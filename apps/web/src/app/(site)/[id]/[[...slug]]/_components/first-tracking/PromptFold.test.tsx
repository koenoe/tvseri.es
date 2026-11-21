// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import PromptFold from './PromptFold';

const hero = (gone: boolean, asking = false) => (
  <MotionProvider>
    <PromptFold asking={asking} gone={gone} onGone={vi.fn()}>
      <button type="button">Not now</button>
    </PromptFold>
    {/* a control drawn for another width: it can't take focus */}
    <div hidden>
      <button type="button">More</button>
    </div>
    <button type="button">Watchlist</button>
  </MotionProvider>
);

describe('PromptFold', () => {
  it('is drawn open in the server’s HTML, never folded shut or faded', () => {
    const html = renderToString(hero(false, true));
    expect(html).toContain('data-prompt=""');
    expect(html).toContain('data-ask=""');
    expect(html).not.toMatch(/height:\s*0/);
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it('marks its frame while it folds away, out of reach', () => {
    const { container, rerender } = render(hero(false));
    rerender(hero(true));
    const frame = container.querySelector('[data-prompt]');
    expect(frame?.hasAttribute('data-leaving')).toBe(true);
    expect(frame?.closest('[inert]')).not.toBeNull();
  });

  it('moves focus from the answer pressed on to the next control that takes it', () => {
    const { rerender } = render(hero(false));
    screen.getByRole('button', { name: 'Not now' }).focus();
    rerender(hero(true));
    expect(document.activeElement?.textContent).toBe('Watchlist');
  });
});
