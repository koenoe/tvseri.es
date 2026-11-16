// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { HelpTab } from '../_lib/importState';
import HelpCard from './HelpCard';

function Harness() {
  const [tab, setTab] = useState<HelpTab>('netflix');
  return <HelpCard onTab={setTab} tab={tab} />;
}

describe('HelpCard', () => {
  it('is a set of tabs, three lines each', async () => {
    render(<Harness />);
    const netflix = screen.getByRole('tab', { name: 'Netflix' });
    expect(netflix.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain(
      'Viewing activity',
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Prime Video' }));
    expect(screen.getByRole('tabpanel').textContent).toContain(
      'Request your data',
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('moves with the arrow keys, wrapping, and keeps one tab in the tab order', async () => {
    render(<Harness />);
    screen.getByRole('tab', { name: 'Netflix' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    const other = screen.getByRole('tab', { name: 'Other CSV' });
    expect(other.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(other);
    expect(
      screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0),
    ).toEqual([other]);
    await userEvent.keyboard('{Home}');
    expect(
      screen
        .getByRole('tab', { name: 'Netflix' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });
});
