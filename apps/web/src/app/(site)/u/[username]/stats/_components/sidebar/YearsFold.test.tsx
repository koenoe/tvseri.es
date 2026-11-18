// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import YearsFold from './YearsFold';

const params = vi.hoisted(() => ({ year: '2026' }));

vi.mock('next/navigation', () => ({
  useParams: () => params,
}));

afterEach(cleanup);

const rowsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const year = 2026 - index;
    return { row: <a href={`#${year}`}>{year}</a>, year };
  });

const years = () =>
  screen.getAllByRole('link').map((link) => Number(link.textContent));

describe('YearsFold', () => {
  it('draws five years whole, with no button', () => {
    params.year = '2026';
    render(<YearsFold className="" rows={rowsOf(5)} />);
    expect(years()).toHaveLength(5);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('folds 21 years to the newest five and opens them all at once', () => {
    params.year = '2026';
    render(<YearsFold className="" rows={rowsOf(21)} />);
    expect(years()).toEqual([2026, 2025, 2024, 2023, 2022]);
    const button = screen.getByRole('button', { name: 'Show all 21 years' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(years()).toHaveLength(21);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Show fewer');
  });

  it('keeps an older page year in its place', () => {
    params.year = '2010';
    render(<YearsFold className="" rows={rowsOf(21)} />);
    expect(years()).toEqual([2026, 2025, 2024, 2023, 2022, 2010]);
  });
});
