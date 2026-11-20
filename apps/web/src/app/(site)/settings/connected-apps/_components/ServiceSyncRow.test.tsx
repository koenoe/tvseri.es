// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render as renderRaw,
  screen,
} from '@testing-library/react';
import type { ConnectionStatus } from '@tvseri.es/schemas';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh, showToast, syncConnection } = vi.hoisted(() => ({
  refresh: vi.fn(),
  showToast: vi.fn(),
  syncConnection: vi.fn(),
}));
vi.mock('../actions', () => ({ syncConnection }));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast }));

/** The card's parts read their service from the panel */
const render = (ui: ReactElement) =>
  renderRaw(ui, {
    wrapper: ({ children }) => (
      <ServiceProvider service="netflix">{children}</ServiceProvider>
    ),
  });
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { formatSinceButton } from '../_lib/syncScope';
import { usePublishReviewCount } from './reviewCount';
import { ServiceProvider } from './ServiceContext';
import ServiceSyncRow from './ServiceSyncRow';

type Sync = NonNullable<ConnectionStatus['sync']>;

const RUNNING: Sync = {
  error: null,
  films: 0,
  finishedAt: null,
  requestedAt: 1_763_099_000_000,
  skipped: 0,
  stalled: false,
  state: 'running',
  unresolved: 0,
  unresolvedOverflow: 0,
  written: 0,
};
/** The card's status read, around its sync */
const STATUS: ConnectionStatus = {
  connected: true,
  lastSyncedAt: null,
  latest: null,
  profileName: 'Koen',
  recent: [],
  resumeFrom: null,
  status: 'ok',
  sync: null,
  total: null,
  unresolvedCount: 0,
  week: [],
};
const DONE: Sync = {
  ...RUNNING,
  finishedAt: 1_763_100_000_000,
  state: 'ok',
  written: 3,
};

beforeEach(() => {
  refresh.mockReset();
  showToast.mockReset();
  syncConnection.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Lets the timers (and the polls they start) run for `ms` */
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

/** The status route answers each service's card with this sync */
const answering = (
  syncs: Readonly<Partial<Record<string, Sync>>>,
  fetchMock = vi.fn(),
) => {
  fetchMock.mockImplementation(async (url: string) => {
    const service = url.split('/').at(-1) ?? '';
    return Response.json({ ...STATUS, sync: syncs[service] ?? null });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('ServiceSyncRow', () => {
  it('shows the last sync’s counts in a status region', () => {
    render(<ServiceSyncRow lastSyncedAt={1} sync={DONE} syncNow={false} />);
    expect(screen.getByRole('status').textContent).toBe('3 new episodes');
  });

  it('counts the review list as it stands, not as the run left it', () => {
    render(
      <ServiceSyncRow
        lastSyncedAt={1}
        sync={{ ...DONE, unresolved: 3 }}
        syncNow={false}
        toReview={1}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      '3 new episodes · 1 to review',
    );
  });

  it('follows the review list’s own count while it is on the page', () => {
    function Live({ count }: Readonly<{ count: number }>) {
      usePublishReviewCount('netflix', count);
      return null;
    }
    const { rerender } = render(
      <>
        <Live count={2} />
        <ServiceSyncRow
          lastSyncedAt={1}
          sync={{ ...DONE, unresolved: 3 }}
          syncNow={false}
          toReview={3}
        />
      </>,
    );
    expect(screen.getByRole('status').textContent).toBe(
      '3 new episodes · 2 to review',
    );
    rerender(
      <>
        <Live count={0} />
        <ServiceSyncRow
          lastSyncedAt={1}
          sync={{ ...DONE, unresolved: 3 }}
          syncNow={false}
          toReview={3}
        />
      </>,
    );
    expect(screen.getByRole('status').textContent).toBe('3 new episodes');
  });

  it('keeps a running sync’s counts out of the status region', () => {
    render(
      <ServiceSyncRow
        lastSyncedAt={null}
        sync={{ ...RUNNING, written: 5 }}
        syncNow={false}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Syncing your Netflix history now…',
    );
  });

  it('offers Sync now only when the plan allows it', () => {
    const { rerender } = render(
      <ServiceSyncRow lastSyncedAt={null} sync={null} syncNow={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    rerender(<ServiceSyncRow lastSyncedAt={null} sync={null} syncNow />);
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeTruthy();
  });

  it('queues a sync on Sync now and says so when it can’t', async () => {
    syncConnection.mockResolvedValue({ error: 'failed', ok: false });
    render(<ServiceSyncRow lastSyncedAt={null} sync={null} syncNow />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    });
    expect(syncConnection).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
  });

  it('asks how far back before the first sync, and sends the day it shows', async () => {
    syncConnection.mockResolvedValue({ ok: true });
    render(<ServiceSyncRow lastSyncedAt={null} sync={null} syncNow />);
    const group = screen.getByRole('group', { name: 'How far back' });
    expect(group.textContent).toBe('SinceEverything');
    const field = screen.getByRole('button', { name: /^Sync since / });
    const shown = field.textContent;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    });
    const [, body] = syncConnection.mock.calls[0]!;
    const since = new Date(body.since);
    // The button's day is the one sent: its start, local time
    expect(since.getHours()).toBe(0);
    expect(shown).toBe(formatSinceButton(since.getTime(), Date.now()));
  });

  it('sends Everything as no day', async () => {
    syncConnection.mockResolvedValue({ ok: true });
    render(
      <ServiceSyncRow lastSyncedAt={null} sync={null} syncNow total={2542} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(
      screen.getByText('All 2,542 episodes in its history, in one go.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Sync since / })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    });
    expect(syncConnection).toHaveBeenCalledWith('netflix', { since: null });
  });

  it('asks only before the first sync: not once one has run or started', () => {
    const { rerender } = render(
      <ServiceSyncRow lastSyncedAt={1} sync={DONE} syncNow />,
    );
    expect(screen.queryByRole('group', { name: 'How far back' })).toBeNull();
    rerender(
      <ServiceSyncRow
        lastSyncedAt={null}
        sync={{ ...RUNNING, stalled: true }}
        syncNow
      />,
    );
    expect(screen.queryByRole('group', { name: 'How far back' })).toBeNull();
  });

  it('after linking again, carries on from where the last sync reached', () => {
    const reached = new Date(2026, 10, 2, 21, 30).getTime();
    render(
      <ServiceSyncRow
        lastSyncedAt={null}
        resumeFrom={reached}
        sync={null}
        syncNow
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'Sync since November 2, 2026, change day',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Carries on from your last sync. Pick an earlier day to read further back.',
      ),
    ).toBeTruthy();
  });

  it('can’t be pressed while a sync runs', () => {
    render(<ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow />);
    const button = screen.getByRole('button', { name: 'Sync now' });
    expect(
      button.hasAttribute('disabled') ||
        button.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
  });

  it('asks the card’s status route every 5 seconds, refreshing the page only on a change', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const fetchMock = answering({ netflix: RUNNING });
    render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />,
    );
    await advance(10_100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/connections/netflix');
    expect(refresh).not.toHaveBeenCalled();

    answering({ netflix: { ...RUNNING, written: 4 } }, fetchMock);
    await advance(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when the sync ends, then stops asking', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const fetchMock = answering({ netflix: DONE });
    const { rerender } = render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />,
    );
    await advance(5_100);
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender(<ServiceSyncRow lastSyncedAt={1} sync={DONE} syncNow={false} />);
    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('backs off to every 30 seconds after the first minute', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const fetchMock = answering({ netflix: RUNNING });
    render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />,
    );
    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    await advance(29_900);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    await advance(200);
    expect(fetchMock).toHaveBeenCalledTimes(13);
  });

  it('shares one timer and one refresh between the page’s syncing cards', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const fetchMock = answering({
      bbc: { ...RUNNING, written: 2 },
      netflix: { ...RUNNING, written: 5 },
    });
    renderRaw(
      <>
        <ServiceProvider service="netflix">
          <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />
        </ServiceProvider>
        <ServiceProvider service="bbc">
          <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />
        </ServiceProvider>
      </>,
    );
    await advance(5_100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/connections/netflix');
    expect(fetchMock).toHaveBeenCalledWith('/api/connections/bbc');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps asking while a long sync still checks in, past 20 minutes', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 45 * 60_000 });
    const fetchMock = answering({ netflix: RUNNING });
    render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />,
    );
    await advance(30_100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops asking once the API says the sync stalled, and offers Sync now again', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const fetchMock = answering({ netflix: RUNNING });
    const { rerender } = render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow />,
    );
    await advance(5_100);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender(
      <ServiceSyncRow
        lastSyncedAt={null}
        sync={{ ...RUNNING, stalled: true }}
        syncNow
      />,
    );
    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe(
      'The last sync stopped before it finished. The next one picks up where it stopped.',
    );
    const button = screen.getByRole('button', { name: 'Sync now' });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('doesn’t ask while the tab is hidden, and catches up when it shows', async () => {
    vi.useFakeTimers({ now: RUNNING.requestedAt + 1000 });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const fetchMock = answering({ netflix: { ...RUNNING, written: 1 } });
    render(
      <ServiceSyncRow lastSyncedAt={null} sync={RUNNING} syncNow={false} />,
    );
    await advance(60_000);
    expect(fetchMock).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });

  it('doesn’t repeat the sign-out while the reconnect block says it', () => {
    const signedOut: Sync = {
      ...DONE,
      error: 'signed-out',
      state: 'failed',
      written: 0,
    };
    render(
      <ServiceSyncRow
        lastSyncedAt={1}
        reconnecting
        sync={signedOut}
        syncNow={false}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
