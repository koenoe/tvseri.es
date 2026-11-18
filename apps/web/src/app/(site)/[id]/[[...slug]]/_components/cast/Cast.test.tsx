// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadCast } from '../../_data/loaders';
import Cast from './Cast';

vi.mock('../../_data/loaders', () => ({ loadCast: vi.fn() }));
vi.mock('../../_lib/ShowProvider', () => ({
  useShow: () => ({ id: 1, title: 'The Bear' }),
}));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const face = (id: number, name: string, role: string) => ({
  id,
  image: `https://image.tmdb.org/${id}.jpg`,
  name,
  role,
  slug: `p-${id}`,
});

const FACES = Array.from({ length: 10 }, (_, index) =>
  face(index + 2, `Actor ${index + 2}`, `Role ${index + 2}`),
);

const STACK = FACES.slice(0, 5);

const LINE = { first: 'Actor 2', rest: ', Actor 3 and 18 more' };

describe('Cast', () => {
  beforeEach(() => {
    vi.mocked(loadCast).mockReset();
  });

  it('says the cast didn’t load, over its settled placeholder, with Try again', async () => {
    vi.mocked(loadCast).mockResolvedValue({ unavailable: true });
    const { container } = render(await Cast({ creators: [], seriesId: 1 }));

    expect(screen.getByText('The cast didn’t load.')).toBeTruthy();
    // the faces' space stays: the placeholder, out of the accessibility tree
    expect(container.querySelector('[data-placeholder="cast"]')).toBeTruthy();
    screen.getByRole('button', { name: /Try again/ }).click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('draws the phone stack of the cast and the row’s "+N", both opening everyone', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 20,
      faces: FACES,
      line: LINE,
      peopleCount: 21,
      stack: STACK,
    });
    const { container } = render(await Cast({ creators: [], seriesId: 1 }));

    const stack = screen.getByRole('button', { name: 'Cast, 20 people' });
    // the rest of the cast: the creator is in the sheet, not the stack
    expect(stack.textContent).toContain('+15');
    expect(stack.textContent).toContain('Actor 2, Actor 3 and 18 more');
    expect(stack.querySelector('b')?.textContent).toBe('Actor 2');
    const more = screen.getByRole('button', {
      name: 'All cast and crew, 21 people',
    });
    expect(more.textContent).toContain('+10');
    expect(more.textContent).toContain('21 people');
    expect(container.querySelectorAll('a[href^="/person/"]')).toHaveLength(10);
  });

  it('has no "+N" in the row when the ten are the whole cast', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 10,
      faces: FACES,
      line: LINE,
      peopleCount: 11,
      stack: STACK,
    });
    render(await Cast({ creators: [], seriesId: 1 }));

    expect(screen.queryByRole('button', { name: /^All / })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Cast, 10 people' }),
    ).toBeTruthy();
  });

  it('counts the cast without a photo in the stack’s "+N"', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 3,
      faces: FACES.slice(0, 3),
      line: { first: 'Actor 2', rest: ', Actor 3 and 1 more' },
      peopleCount: 3,
      stack: FACES.slice(0, 2),
    });
    render(await Cast({ creators: [], seriesId: 1 }));

    const stack = screen.getByRole('button', { name: 'Cast, 3 people' });
    expect(stack.querySelectorAll('img')).toHaveLength(2);
    expect(stack.textContent).toContain('+1');
  });

  it('reserves nothing without a cast, even with creators', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 0,
      faces: [],
      line: { first: '', rest: '' },
      peopleCount: 1,
      stack: [],
    });
    const { container } = render(await Cast({ creators: [], seriesId: 1 }));

    expect(container.innerHTML).toBe('');
  });
});
