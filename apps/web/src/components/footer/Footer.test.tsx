// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Footer from './Footer';

// The toast's footer clearance (a browser observer) has its own test
vi.mock('./FooterToastClearance', () => ({ default: () => null }));

/** The sentence as a reader hears it: each logo link by its label. */
const readSentence = (element: HTMLElement) => {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const link of copy.querySelectorAll('a[aria-label]')) {
    link.replaceWith(link.getAttribute('aria-label') ?? '');
  }
  return copy.textContent;
};

describe('Footer (FTFinal)', () => {
  it('draws the 18px logo over production’s credits sentence, verbatim', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(
      footer
        .querySelector('svg[aria-label="tvseri.es"]')
        ?.getAttribute('class'),
    ).toContain('h-[18px]');
    const sentence = footer.querySelector('p');
    expect(sentence).not.toBeNull();
    expect(readSentence(sentence as HTMLElement)).toBe(
      'This site uses data from TMDB, ratings from OMDb (CC BY-NC 4.0) and streaming availability from JustWatch but is neither certified nor endorsed by them.',
    );
  });

  it.each([
    ['TMDB', 'https://www.themoviedb.org'],
    ['JustWatch', 'https://www.justwatch.com'],
  ])('links the %s logo, in a new tab without an opener', (name, href) => {
    render(<Footer />);

    const link = screen.getByRole('link', { name });
    expect(link.getAttribute('href')).toBe(href);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    // the logo is decorative: the link carries the name
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('credits OMDb (CC BY-NC 4.0) as a plain link in the sentence', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'OMDb' });
    expect(link.getAttribute('href')).toBe('https://www.omdbapi.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.closest('p')?.textContent).toContain('ratings from OMDb');
  });

  it('links the OMDb licence right after its name', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'CC BY-NC 4.0' });
    expect(link.getAttribute('href')).toBe(
      'https://creativecommons.org/licenses/by-nc/4.0/',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('links GitHub in a new tab and says so', () => {
    render(<Footer />);

    const link = screen.getByRole('link', {
      name: /^GitHub\s*\(opens in a new tab\)$/,
    });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/koenoe/tvseri.es',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has a Top link to #top, without script', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'Top' }).getAttribute('href')).toBe(
      '#top',
    );
  });

  it('links Privacy in the same tab, between GitHub and Top', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'Privacy' });
    expect(link.getAttribute('href')).toBe('/privacy');
    expect(link.getAttribute('target')).toBeNull();
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(
      screen.getAllByRole('link').map((item) => item.textContent?.trim()),
    ).toEqual([
      '',
      'OMDb',
      'CC BY-NC 4.0',
      '',
      'GitHub (opens in a new tab)',
      'Privacy',
      'Top',
    ]);
  });
});
