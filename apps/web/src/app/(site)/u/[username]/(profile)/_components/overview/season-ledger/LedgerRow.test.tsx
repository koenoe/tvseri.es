// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LedgerRow from './LedgerRow';
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
});
