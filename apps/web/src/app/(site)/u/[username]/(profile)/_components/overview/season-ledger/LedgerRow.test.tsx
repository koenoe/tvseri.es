// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';
import LedgerRow from './LedgerRow';
import type { HoleState } from './ledgerLines';
import type { LedgerEpisodeView } from './loadLedger';

const episode: LedgerEpisodeView = {
  aired: 'Aired Feb 2005',
  code: 'S02E04',
  episode: 4,
  season: 2,
  title: 'A made-up episode',
};

describe('LedgerRow', () => {
  it('settles an answered row without fading its text', () => {
    const { container } = render(
      <LedgerRow
        episode={episode}
        onChoose={vi.fn()}
        onIntent={vi.fn()}
        state="watched"
      />,
    );
    expect(screen.getByText('Undo')).toBeTruthy();
    // opacity on the row would take its white/60 lines below the floor
    const faded = [...container.querySelectorAll('*')].filter((element) =>
      /(^|\s)opacity-\d/.test(element.getAttribute('class') ?? ''),
    );
    expect(faded).toEqual([]);
  });

  it('hands focus from the button pressed to Undo, and back', () => {
    const row = (state: HoleState) => (
      <MotionProvider>
        <LedgerRow
          episode={episode}
          onChoose={vi.fn()}
          onIntent={vi.fn()}
          state={state}
        />
      </MotionProvider>
    );
    const { rerender } = render(row('open'));
    screen.getByRole('button', { name: 'Skipped' }).focus();
    rerender(row('skipped'));
    expect(document.activeElement?.textContent).toBe('Undo');
    rerender(row('open'));
    expect(document.activeElement?.textContent).toBe('Watched');
  });
});
