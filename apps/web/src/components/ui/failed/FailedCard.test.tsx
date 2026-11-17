// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FailedCard, { TryAgain } from './FailedCard';
import type { FailedLook, TryAgainLook } from './failedLooks';

const COLUMN: FailedLook = {
  body: 'body-class',
  box: 'box-class',
  text: 'text-class',
  title: 'title-class',
};
const LINE: FailedLook = { box: 'line-box', title: 'line-title' };
const BUTTON: TryAgainLook = { className: 'button-class', glyph: 16 };

describe('FailedCard', () => {
  it('draws the mark, the title and line, and the place’s control', () => {
    const onClick = vi.fn();
    render(
      <FailedCard
        action={<TryAgain look={BUTTON} onClick={onClick} />}
        body="The rest of the page is fine."
        look={COLUMN}
        mark={<span data-testid="mark" />}
        role="alert"
        title="Hidden gems didn’t load."
      />,
    );
    const card = screen.getByRole('alert');
    expect(card.contains(screen.getByTestId('mark'))).toBe(true);
    expect(card.textContent).toContain('Hidden gems didn’t load.');
    expect(card.textContent).toContain('The rest of the page is fine.');
    const button = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('draws a one-line look’s title alone, with aria-busy', () => {
    render(
      <FailedCard
        aria-busy={false}
        className="min-h-60"
        look={LINE}
        mark={null}
        role="status"
        title="Trying Profile again…"
      />,
    );
    const card = screen.getByRole('status');
    expect(card.getAttribute('aria-busy')).toBe('false');
    expect(card.textContent).toBe('Trying Profile again…');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('TryAgain', () => {
  it('reserves the longer label, so a retry moves nothing', () => {
    render(<TryAgain look={BUTTON} onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.textContent).toContain('Loading…');
  });

  it('shows a retry in flight the same way everywhere, focusable and ignoring presses', () => {
    const onClick = vi.fn();
    render(<TryAgain look={BUTTON} onClick={onClick} pending />);
    const button = screen.getByRole('button', { name: 'Loading…' });
    // aria-disabled, not disabled: the focus stays on the button
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    // regression: the dim follows aria-disabled now that disabled is gone
    expect(button.className).toContain('aria-disabled:opacity-50');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
