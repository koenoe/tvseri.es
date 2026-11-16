// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Cast from './Cast';

vi.mock('../../_data/loaders', () => ({
  loadCast: vi.fn(async () => ({ unavailable: true })),
}));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('Cast', () => {
  it('says the cast didn’t load, over its settled placeholder, with Try again', async () => {
    const { container } = render(await Cast({ seriesId: 1 }));

    expect(screen.getByText('The cast didn’t load.')).toBeTruthy();
    // the faces' space stays: the placeholder, out of the accessibility tree
    expect(container.querySelector('[data-placeholder="cast"]')).toBeTruthy();
    screen.getByRole('button', { name: /Try again/ }).click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
