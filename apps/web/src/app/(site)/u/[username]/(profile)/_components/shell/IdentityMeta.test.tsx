// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import MarkingProvider from '@/lib/marking/MarkingProvider';

import type { Profile } from '../../_data/profile';
import IdentityMeta, { CompactIdentityMeta } from './IdentityMeta';

const apiFetch = vi.fn();

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));

const profile = {
  accessToken: 'token',
  user: { id: 'u-juno', username: 'juno' },
  viewer: 'visitor',
  viewerId: 'u-alex',
} as unknown as Profile;

beforeEach(() => {
  apiFetch.mockReset();
});

describe('the sidebar counts', () => {
  it('say so when a read timed out, and keep both lines', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    render(await IdentityMeta({ profile }), { wrapper: MarkingProvider });
    expect(screen.getByText('Counts unavailable right now')).toBeTruthy();
    // the followers line stays a link to Circle
    expect(
      screen
        .getByRole('link', { name: /Followers and following/ })
        .getAttribute('href'),
    ).toBe('/u/juno/circle');
  });

  it('read as the meta line when they load', async () => {
    apiFetch.mockImplementation(
      (
        path: string,
        options?: { params?: { list?: string; id: string; fid?: string } },
      ) => {
        if (path === '/user/:id/following/:fid') {
          return Promise.resolve({ value: true });
        }
        if (path === '/user/:id/watched/count') {
          return Promise.resolve({ count: 5341 });
        }
        if (options?.params?.list === 'watched') {
          return Promise.resolve({ count: 218 });
        }
        return Promise.resolve({ count: path.includes('followers') ? 6 : 8 });
      },
    );
    render(await IdentityMeta({ profile }), { wrapper: MarkingProvider });
    expect(screen.getByText('5,341 episodes, 218 finished')).toBeTruthy();
    expect(screen.getByText(/6 followers · 8 following/)).toBeTruthy();
    expect(screen.getByText('Follows you')).toBeTruthy();
  });

  it('join on one line in the compact identity', async () => {
    apiFetch.mockImplementation(
      (path: string, options?: { params?: { list?: string } }) => {
        if (path === '/user/:id/watched/count') {
          return Promise.resolve({ count: 5341 });
        }
        return Promise.resolve({
          count: options?.params?.list === 'watched' ? 218 : 6,
        });
      },
    );
    render(await CompactIdentityMeta({ profile }), {
      wrapper: MarkingProvider,
    });
    expect(screen.getByText('5,341 episodes · 218 finished')).toBeTruthy();
  });

  it('say so in the compact identity when a read failed', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    render(await CompactIdentityMeta({ profile }), {
      wrapper: MarkingProvider,
    });
    expect(screen.getByText('Counts unavailable right now')).toBeTruthy();
  });
});
