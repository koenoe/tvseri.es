// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { PersonFamily } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

const loadFamilyAndAwards = vi.fn();
vi.mock('@/lib/person/loaders', () => ({
  loadFamilyAndAwards,
  loadShows: vi.fn(),
}));

const { default: FamilyFacts } = await import('./FamilyFacts');

const renderFamily = async (family: PersonFamily) => {
  loadFamilyAndAwards.mockResolvedValue({ awards: null, family });
  render(await FamilyFacts({ died: true, id: 1 }));
  return screen.getByRole('group', { name: 'Family and awards' });
};

describe('FamilyFacts', () => {
  it('links a spouse and a child with their own page the same way', async () => {
    const group = await renderFamily({
      children: [
        {
          id: 'Q3',
          name: 'Ivanka Trump',
          relation: 'daughter',
          slug: 'ivanka-trump',
          tmdbId: 1224937,
        },
      ],
      spouses: [
        {
          id: 'Q2',
          name: 'Melania Trump',
          slug: 'melania-trump',
          startYear: 2005,
          tmdbId: 1235,
        },
      ],
    });

    expect(group.textContent).toContain('Married to Melania Trump since 2005');
    const spouse = screen.getByRole('link', { name: 'Melania Trump' });
    const child = screen.getByRole('link', { name: 'Ivanka Trump' });
    expect(spouse.getAttribute('href')).toBe('/person/1235/melania-trump');
    expect(child.getAttribute('href')).toBe('/person/1224937/ivanka-trump');
    expect(spouse.className).toBe(child.className);
  });

  it('keeps a spouse TMDB does not know as plain text', async () => {
    const group = await renderFamily({
      children: [],
      spouses: [{ endYear: 1982, id: 'Q1', name: 'A Spouse', startYear: 1977 }],
    });

    expect(group.textContent).toBe('Married to A Spouse, 1977–1982');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
