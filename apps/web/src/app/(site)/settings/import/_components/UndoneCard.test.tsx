// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import UndoneCard from './UndoneCard';

describe('UndoneCard', () => {
  it('takes the focus to Start again when the Undo it replaces goes', () => {
    const onStartAgain = vi.fn();
    const { rerender } = render(<button type="button">Undoing…</button>);
    screen.getByRole('button', { name: 'Undoing…' }).focus();

    rerender(<UndoneCard onStartAgain={onStartAgain} />);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Start again' }),
    );
  });
});
