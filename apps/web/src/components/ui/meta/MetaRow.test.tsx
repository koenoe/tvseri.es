// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  calendarGlyph,
  clockGlyph,
  seasonGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';

import MetaItem from './MetaItem';
import MetaRow from './MetaRow';

describe('MetaRow', () => {
  it('renders its items in order, each with an icon', () => {
    render(
      <MetaRow data-testid="row">
        <MetaItem icon={calendarGlyph}>2022</MetaItem>
        <MetaItem icon={seasonGlyph}>2 seasons</MetaItem>
        <MetaItem icon={tagGlyph}>Drama</MetaItem>
      </MetaRow>,
    );
    const row = screen.getByTestId('row');
    const texts = Array.from(row.querySelectorAll('[title]'), (item) =>
      item.getAttribute('title'),
    );
    expect(texts).toEqual(['2022', '2 seasons', 'Drama']);
    expect(row.querySelectorAll('svg')).toHaveLength(3);
  });

  it('puts the full text in a title so a truncated item can be read on hover', () => {
    render(
      <MetaRow>
        <MetaItem icon={tagGlyph} shrink>
          Drama, Comedy, Crime, Mystery
        </MetaItem>
      </MetaRow>,
    );
    const text = screen.getByText('Drama, Comedy, Crime, Mystery');
    expect(text.getAttribute('title')).toBe('Drama, Comedy, Crime, Mystery');
  });

  it('renders nothing for a missing value but shows 0', () => {
    render(
      <MetaRow data-testid="row">
        <MetaItem icon={calendarGlyph}>{null}</MetaItem>
        <MetaItem icon={clockGlyph}>{''}</MetaItem>
        <MetaItem icon={seasonGlyph}>{0}</MetaItem>
      </MetaRow>,
    );
    const row = screen.getByTestId('row');
    expect(row.querySelectorAll('svg')).toHaveLength(1);
    expect(row.querySelector('[title]')?.textContent).toBe('0');
  });
});
