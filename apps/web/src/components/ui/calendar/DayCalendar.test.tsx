// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import DayCalendar from './DayCalendar';

const NOW = Date.UTC(2026, 10, 12, 12); // Thu 12 Nov 2026
const noop = () => {};

describe('DayCalendar', () => {
  it('ends the last row with the month on phones; desktop keeps it faded', () => {
    render(<DayCalendar now={NOW} onPick={noop} selected={null} />);
    const cells = screen.getAllByRole('gridcell');
    const last = cells.slice(-7);
    expect(last.map((cell) => cell.textContent)).toEqual([
      '30',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(
      last.map((cell) => cell.className.includes('max-sm:invisible')),
    ).toEqual([false, true, true, true, true, true, true]);
    expect(cells[0]!.className.includes('max-sm:invisible')).toBe(false);
  });

  it('the month before slides away out of reach as the next one arrives', () => {
    render(
      <MotionProvider>
        <DayCalendar now={NOW} onPick={noop} selected={null} />
      </MotionProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));

    const weeks = Array.from(document.querySelectorAll('tbody'));
    expect(weeks).toHaveLength(2);
    const leaving = weeks.filter(
      (tbody) => tbody.getAttribute('aria-hidden') === 'true',
    );
    expect(leaving).toHaveLength(1);
    expect(leaving[0]?.textContent).toContain('30');
    expect(leaving[0]?.className).toContain('pointer-events-none');
  });
});
