// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import YearsFold from './YearsFold';

afterEach(cleanup);

const rowsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const year = 2026 - index;
    const row = (
      <a href={`#${year}`} key={year}>
        {year}
      </a>
    );
    return { row, year };
  });

it('draws each year as one list item of its own', () => {
  render(<YearsFold className="" rows={rowsOf(3)} selected={2026} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(items.every((item) => item.querySelector('li') === null)).toBe(true);
  cleanup();
});

const years = () =>
  screen.getAllByRole('link').map((link) => Number(link.textContent));

describe('YearsFold', () => {
  it('draws five years whole, with no button', () => {
    render(<YearsFold className="" rows={rowsOf(5)} selected={2026} />);
    expect(years()).toHaveLength(5);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('folds 21 years to the newest five and opens them all at once', () => {
    render(<YearsFold className="" rows={rowsOf(21)} selected={2026} />);
    expect(years()).toEqual([2026, 2025, 2024, 2023, 2022]);
    const button = screen.getByRole('button', { name: 'Show all 21 years' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(years()).toHaveLength(21);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Show fewer');
  });

  it('keeps an older selected year in its place', () => {
    render(<YearsFold className="" rows={rowsOf(21)} selected={2010} />);
    expect(years()).toEqual([2026, 2025, 2024, 2023, 2022, 2010]);
  });
});

it('keeps a row (and its focus) when the selected year changes with the list open', () => {
  const { rerender } = render(
    <YearsFold className="" rows={rowsOf(21)} selected={2026} />,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Show all/ }));
  const older = screen.getByRole('link', { name: '2015' });
  older.focus();
  rerender(<YearsFold className="" rows={rowsOf(21)} selected={2015} />);
  expect(screen.getByRole('link', { name: '2015' })).toBe(older);
  expect(document.activeElement).toBe(older);
  cleanup();
});
