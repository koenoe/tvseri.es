// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Spotlight from './Spotlight';

vi.mock('@/components/marking/MarkControl', () => ({
  default: () => null,
}));

const show = {
  backdrop: null,
  id: 42,
  logo: 'https://image.tmdb.org/t/p/w500/black-mirror.png',
  slug: 'black-mirror',
  title: 'Black Mirror',
};

describe('Spotlight', () => {
  it('names the show with its logo, linked to the show', () => {
    render(<Spotlight kicker="Start here" reason="Any episode." show={show} />);
    const link = screen.getByRole('link', { name: 'Black Mirror' });
    const logo = link.querySelector('img');
    expect(logo?.getAttribute('src')).toContain('black-mirror.png');
    expect(logo?.getAttribute('alt')).toBe('');
    expect(link.textContent).toBe('');
  });

  it('falls back to the title as text without a logo', () => {
    render(
      <Spotlight
        kicker="Start here"
        reason="Any episode."
        show={{ ...show, logo: null }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Black Mirror' });
    expect(link.textContent).toBe('Black Mirror');
    expect(link.querySelector('img')).toBeNull();
  });

  it('uses the phone shade on a phone, the desktop one from md', () => {
    const { container } = render(
      <Spotlight kicker="Start here" reason="Any episode." show={show} />,
    );
    // in the picture's layer, over the backdrop
    const shade = container.querySelector('article > span[aria-hidden] > span');
    // near-black: the landing sets no picture colour (`--picture-shade`)
    expect(shade?.className).toContain(
      'via-[color:var(--picture-shade,rgb(12_15_16))]/60',
    );
    expect(shade?.className).toContain('via-45%');
    expect(shade?.className).toContain('to-80%');
    expect(shade?.className).toContain(
      'md:via-[color:var(--picture-shade,rgb(12_15_16))]/72',
    );
    expect(shade?.className).toContain('md:via-42%');
    expect(shade?.className).toContain('md:to-78%');
  });
});
