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

  it('draws the phone stack and the row’s "+N", both counting everyone else in the sheet', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 20,
      faces: FACES,
      peopleCount: 21,
      stack: STACK,
    });
    const { container } = render(await Cast({ creators: [], seriesId: 1 }));

    // the phone stack and the desktop row's circle open the same list
    const [stack, more] = screen.getAllByRole('button', {
      name: 'All cast and crew, 21 people',
    });
    // five faces + 16 = 21: the crew counts too, as in the sheet
    expect(stack?.textContent).toContain('+16');
    // faces and "+N" only: no names line under them
    expect(stack?.querySelector('b')).toBeNull();
    // ten faces + 11 = 21, the caption's number
    expect(more?.textContent).toContain('+11');
    expect(more?.textContent).toContain('21 people');
    expect(container.querySelectorAll('a[href^="/person/"]')).toHaveLength(10);
  });

  it('adds up on a long show, digits grouped', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 2622,
      faces: FACES,
      peopleCount: 2803,
      stack: STACK,
    });
    render(await Cast({ creators: [], seriesId: 1 }));

    const [stack, more] = screen.getAllByRole('button', {
      name: 'All cast and crew, 2,803 people',
    });
    expect(stack?.textContent).toContain('+2,798');
    expect(more?.textContent).toContain('+2,793');
  });

  it('has no "+N" in the row when the ten are everyone', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 10,
      faces: FACES,
      peopleCount: 10,
      stack: STACK,
    });
    render(await Cast({ creators: [], seriesId: 1 }));

    // only the phone stack: the desktop row has no circle to add
    expect(
      screen.getAllByRole('button', { name: 'All cast and crew, 10 people' }),
    ).toHaveLength(1);
  });

  it('counts the cast without a photo in the stack’s "+N"', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 3,
      faces: FACES.slice(0, 3),
      peopleCount: 3,
      stack: FACES.slice(0, 2),
    });
    render(await Cast({ creators: [], seriesId: 1 }));

    const stack = screen.getByRole('button', {
      name: 'All cast and crew, 3 people',
    });
    expect(stack.querySelectorAll('img')).toHaveLength(2);
    expect(stack.textContent).toContain('+1');
  });

  it('reserves nothing without a cast, even with creators', async () => {
    vi.mocked(loadCast).mockResolvedValue({
      castCount: 0,
      faces: [],
      peopleCount: 1,
      stack: [],
    });
    const { container } = render(await Cast({ creators: [], seriesId: 1 }));

    expect(container.innerHTML).toBe('');
  });
});
