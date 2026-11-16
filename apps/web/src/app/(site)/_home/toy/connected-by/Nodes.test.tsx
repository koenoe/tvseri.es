// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PersonNode } from './Nodes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
}));

/** The longest kind of name a path brings: three parts and two roles */
const PERSON = {
  characters: ['Detective Sergeant Kelli Lombardo', 'Dr. Faye Miller'],
  id: 1,
  image: '',
  name: 'Mary Elizabeth Winstead-Hartley',
  slug: 'mary-elizabeth-winstead-hartley',
};

describe('PersonNode', () => {
  it('clamps the name and the roles: two lines on a phone, one from md (the 272px card)', () => {
    render(<PersonNode person={PERSON} />);
    const name = screen.getByText(PERSON.name);
    const roles = screen.getByText(
      'Detective Sergeant Kelli Lombardo · Dr. Faye Miller',
    );
    for (const element of [name, roles]) {
      expect(element.className).toContain('line-clamp-2');
      expect(element.className).toContain('md:line-clamp-1');
    }
  });

  it('keeps the full text in the hover title and the link’s name', () => {
    render(<PersonNode person={PERSON} />);
    expect(screen.getByText(PERSON.name).getAttribute('title')).toBe(
      PERSON.name,
    );
    expect(
      screen.getByRole('link', {
        name: 'Mary Elizabeth Winstead-Hartley, Detective Sergeant Kelli Lombardo · Dr. Faye Miller',
      }),
    ).toBeTruthy();
  });

  it('keeps the roles’ box without roles, so the chain keeps its height', () => {
    const { container } = render(
      <PersonNode person={{ ...PERSON, characters: [] }} />,
    );
    const small = container.querySelector('small');
    expect(small?.className).toContain('min-h-10');
    expect(small?.getAttribute('aria-hidden')).toBe('true');
  });
});
