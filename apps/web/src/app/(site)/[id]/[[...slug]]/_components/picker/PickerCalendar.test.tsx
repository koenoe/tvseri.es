// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PickerCalendar from './PickerCalendar';

const NOW = Date.UTC(2026, 10, 12, 12); // Thu 12 Nov 2026
const noop = () => {};

describe('PickerCalendar', () => {
  it('ends the last row with the month on phones; desktop keeps it faded', () => {
    render(<PickerCalendar now={NOW} onPick={noop} selected={null} />);
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
});
