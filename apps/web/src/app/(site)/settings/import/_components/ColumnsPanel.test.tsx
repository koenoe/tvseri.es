// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ColumnMapping, DetectedSource } from '../_lib/columns';
import ColumnsPanel from './ColumnsPanel';

const filledIn: ColumnMapping = {
  date: 'Date',
  episode: 'Title',
  season: 'Title',
  service: { kind: 'none' },
  show: 'Title',
};
const source: DetectedSource = {
  kind: 'netflix',
  mapping: filledIn,
  recognised: true,
};

const panel = (mapping: ColumnMapping, onMapping = vi.fn()) => (
  <ColumnsPanel
    combined={{ episode: true, season: true, show: true }}
    dateExample="20 Nov 2026"
    dateOrder="dmy"
    headers={['Title', 'Date']}
    mapping={mapping}
    onMapping={onMapping}
    providers={[]}
    source={source}
  />
);

describe('ColumnsPanel', () => {
  // The button leaves with the change it undid: focus mustn't fall to the page
  it('hands focus to the Columns heading on Back to what we filled in', async () => {
    const onMapping = vi.fn();
    const { rerender } = render(
      panel({ ...filledIn, date: 'Title' }, onMapping),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Back to what we filled in' }),
    );
    expect(onMapping).toHaveBeenCalledWith(filledIn);
    rerender(panel(filledIn, onMapping));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Columns' }),
    );
  });
});
