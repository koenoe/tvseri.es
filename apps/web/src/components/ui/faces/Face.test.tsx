// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Face, { type FaceLook } from './Face';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

const LOOK: FaceLook = {
  blank: 'face-blank',
  caption: 'face-caption',
  link: 'face-link',
  name: 'face-name',
  photo: 'face-photo',
  role: 'face-role',
  size: 192,
  sizes: '96px',
};

describe('Face', () => {
  it('links to the person under the place’s label, the photo in its ring', () => {
    render(
      <Face
        alt="Ayo Edebiri"
        href="/person/1/ayo-edebiri"
        image="https://image.example/ayo.jpg"
        label="Ayo Edebiri as Sydney"
        look={LOOK}
        name="Ayo Edebiri"
        role="Sydney"
      />,
    );

    const link = screen.getByRole('link', { name: 'Ayo Edebiri as Sydney' });
    expect(link.className).toBe('face-link');
    expect(link.getAttribute('href')).toBe('/person/1/ayo-edebiri');
    const photo = link.querySelector('img');
    expect(photo?.className).toBe('face-photo');
    expect(photo?.getAttribute('alt')).toBe('Ayo Edebiri');
    expect(link.querySelector('.face-caption')?.textContent).toBe(
      'Ayo EdebiriSydney',
    );
  });

  it('draws the blank circle for a person without a photo', () => {
    render(
      <Face
        alt="Nobody"
        href="/person/2"
        image=""
        label="Nobody"
        look={LOOK}
        name="Nobody"
        role=""
      />,
    );

    const link = screen.getByRole('link', { name: 'Nobody' });
    expect(link.querySelector('img')).toBeNull();
    expect(link.querySelector('.face-blank')).toBeTruthy();
  });
});
