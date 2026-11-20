// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import PickSwitcher from './PickSwitcher';

afterEach(cleanup);

const NOT_NOW = { name: 'Not now, show another pick' };

const switcher = (cards: ReadonlyArray<string>) => (
  <MotionProvider>
    <button type="button">Elsewhere</button>
    <PickSwitcher
      cards={cards.map((card) => <p key={card}>{card}</p>)}
      fallback={<p>Nothing in progress</p>}
    />
  </MotionProvider>
);

describe('PickSwitcher', () => {
  it('keeps focus on Not now while the picks swap', () => {
    render(switcher(['The Bear', 'Severance']));
    const notNow = screen.getByRole('button', NOT_NOW);
    notNow.focus();
    fireEvent.click(notNow);
    expect(screen.getAllByText('Severance')).toHaveLength(1);
    expect(document.activeElement).toBe(notNow);
  });

  it('hands focus to the empty line when the last pick goes', () => {
    render(switcher(['The Bear']));
    const notNow = screen.getByRole('button', NOT_NOW);
    notNow.focus();
    fireEvent.click(notNow);
    expect(document.activeElement?.textContent).toBe('Nothing in progress');
  });

  it('leaves focus where it is when the picks run out without a press', () => {
    const { rerender } = render(switcher(['The Bear', 'Severance']));
    fireEvent.click(screen.getByRole('button', NOT_NOW));
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    // a refresh brings fewer picks than the one shown
    rerender(switcher(['The Bear']));
    expect(document.activeElement?.textContent).toBe('Elsewhere');
  });
});
