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
  it('draws the mark, the title and line in the look’s column, and the place’s control', () => {
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
    expect(card.className).toBe('box-class');
    expect(card.firstElementChild).toBe(screen.getByTestId('mark'));
    const column = card.querySelector('.text-class');
    expect(column?.children).toHaveLength(2);
    expect(screen.getByText('Hidden gems didn’t load.').className).toBe(
      'title-class',
    );
    expect(screen.getByText('The rest of the page is fine.').className).toBe(
      'body-class',
    );
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button.className).toContain('button-class');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('puts a one-line look’s title straight in the box, with the place’s space and aria-busy', () => {
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
    expect(card.className).toBe('line-box min-h-60');
    expect(card.getAttribute('aria-busy')).toBe('false');
    expect(card.children).toHaveLength(1);
    expect(card.firstElementChild?.className).toBe('line-title');
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

  it('shows a retry in flight the same way everywhere', () => {
    render(<TryAgain look={BUTTON} onClick={vi.fn()} pending />);
    const button = screen.getByRole('button', { name: 'Loading…' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.className).toContain('disabled:opacity-50');
    expect(button.querySelector('svg')?.getAttribute('class')).toContain(
      'animate-spin',
    );
  });
});
