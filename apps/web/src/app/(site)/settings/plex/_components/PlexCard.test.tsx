import { isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const TOKEN = 'f00df00df00df00df00df00d';
const apiFetch = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock('../../_data/session', () => ({
  getSettingsViewer: async () => ({
    accessToken: 'session-token',
    id: 'U1',
    role: 'user',
  }),
}));
vi.mock('@/lib/series/loaders', () => ({
  loadSeriesOrNull: async () => ({
    backdropImage: null,
    title: 'Billions',
    titleTreatmentImage: null,
  }),
}));

import PlexCard from './PlexCard';

const CONNECTED = {
  connected: true,
  createdAt: '2025-02-01T10:00:00.000Z',
  lastAccount: { id: 1, title: 'rae' },
  lastReceivedAt: 1_762_000_000_000,
  onlyAccount: null,
  paused: false,
  recent: [
    {
      episodeNumber: 2,
      seasonNumber: 4,
      seriesId: 62852,
      title: 'Billions',
      watchedAt: 1_762_000_000_000,
    },
  ],
  urlWorks: true,
  week: [],
};

/** Every prop value of the element tree, as text (what the RSC payload carries). */
const serialise = (node: ReactNode): string =>
  JSON.stringify(node, (_key, value: unknown) =>
    isValidElement(value)
      ? { props: value.props, type: String(value.type) }
      : typeof value === 'function'
        ? `fn:${value.name}`
        : value,
  );

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (path: string) =>
    path === '/webhook/type/:type/status' ? CONNECTED : { token: TOKEN },
  );
});

describe('PlexCard', () => {
  it('never reads the webhook token or puts it in the client props', async () => {
    const element = await PlexCard();
    expect(serialise(element)).not.toContain(TOKEN);
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/webhook/type/:type/status',
    ]);
  });

  it('tells the client a URL exists, without it', async () => {
    const element = await PlexCard();
    expect(isValidElement(element)).toBe(true);
    const props = (element as { props: Record<string, unknown> }).props;
    expect(props.hasUrl).toBe(true);
    expect(props).not.toHaveProperty('token');
  });

  it('passes on that the edge refuses the URL', async () => {
    apiFetch.mockImplementation(async () => ({
      ...CONNECTED,
      urlWorks: false,
    }));
    const element = await PlexCard();
    const props = (element as { props: Record<string, unknown> }).props;
    expect(props.urlWorks).toBe(false);
  });
});
