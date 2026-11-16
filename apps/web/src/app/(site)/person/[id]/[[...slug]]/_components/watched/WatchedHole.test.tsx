// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, getViewer, loadShowsView } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getViewer: vi.fn(),
  loadShowsView: vi.fn(),
}));

vi.mock('@/auth/viewer', () => ({ getViewer }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));
vi.mock('../../_data/loaders', () => ({ loadShowsView }));
vi.mock('./SeedWatched', () => ({ default: () => null }));

const { default: WatchedHole } = await import('./WatchedHole');

const watched = {
  episodes: 74,
  items: [],
  shows: 3,
  totalShows: 70,
};

beforeEach(() => {
  vi.clearAllMocks();
  getViewer.mockResolvedValue({ accessToken: 't', id: 'u', role: 'user' });
});

describe('WatchedHole', () => {
  it("reads the Shows count beside the viewer's marks, not after them", async () => {
    let answer: (value: typeof watched) => void = () => undefined;
    apiFetch.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    loadShowsView.mockResolvedValue({ total: 67 });
    const hole = WatchedHole({ gender: 'male', id: 17419 });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(loadShowsView).toHaveBeenCalledWith(17419, 'male');
    answer(watched);
    render(await hole);
    expect(screen.getByRole('group').textContent).toBe(
      'Watched 74 episodes, 3 of 67 series',
    );
  });

  it("falls back to the API's count when the Shows read fails", async () => {
    apiFetch.mockResolvedValue(watched);
    loadShowsView.mockRejectedValue(new Error('down'));
    render(await WatchedHole({ gender: 'male', id: 17419 }));
    expect(screen.getByRole('group').textContent).toBe(
      'Watched 74 episodes, 3 of 70 series',
    );
  });
});
