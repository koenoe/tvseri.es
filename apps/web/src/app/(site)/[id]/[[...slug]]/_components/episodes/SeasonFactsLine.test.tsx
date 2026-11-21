// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SeasonFacts } from './facts';
import SeasonFactsLine from './SeasonFactsLine';

const facts: SeasonFacts = {
  count: '10 episodes',
  date: 'Jun 26, 2024',
  last: { kind: 'eye', text: 'Watched' },
  skipped: null,
};

/** The "Watched" fact's item (its words sit inside it) */
const watched = () =>
  screen.getByText('Watched').closest('[class*="group/meta-item"]');

describe('SeasonFactsLine', () => {
  it('a season completed here: "Watched" rises in, once', () => {
    const { rerender } = render(
      <SeasonFactsLine completed={1} facts={facts} />,
    );
    expect(watched()?.className).toContain('starting:');
    // A route Next keeps in a hidden <Activity> re-applies @starting-style
    // when Back shows it again: once played, the rise is dropped
    fireEvent.transitionEnd(watched() as Element, { propertyName: 'opacity' });
    expect(watched()?.className).not.toContain('starting:');
    rerender(<SeasonFactsLine completed={1} facts={facts} />);
    expect(watched()?.className).not.toContain('starting:');
  });

  it('a season already complete draws "Watched" still', () => {
    render(<SeasonFactsLine completed={null} facts={facts} />);
    expect(watched()?.className).not.toContain('starting:');
  });
});
