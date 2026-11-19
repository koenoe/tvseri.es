// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ConnectionStatus } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserSupport } from '@/lib/extension/browserSupport';
import { extensionInstall, linkFailureText } from '@/lib/extension/extension';
import { NETFLIX } from '../../_lib/services/netflix';
import ServicePanel from './ServicePanel';

const { disconnectConnection, refresh, showToast } = vi.hoisted(() => ({
  disconnectConnection: vi.fn(),
  refresh: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock('../actions', () => ({ disconnectConnection }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast }));

/** The accordion the card needs: bodies always shown, toggles inert. */
vi.mock('./AppsAccordion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./AppsAccordion')>()),
  AppBody: ({ children }: Readonly<{ children: ReactNode }>) => (
    <div>{children}</div>
  ),
  AppToggle: () => <button type="button">Hide Netflix</button>,
}));

const NOT_CONNECTED: ConnectionStatus = {
  connected: false,
  lastSyncedAt: null,
  latest: null,
  profileName: null,
  recent: [],
  resumeFrom: null,
  status: null,
  sync: null,
  total: null,
  unresolvedCount: 0,
  week: [],
};

const CONNECTED: ConnectionStatus = {
  connected: true,
  lastSyncedAt: null,
  latest: {
    episodeTitle: 'Alpha and Omega',
    title: 'Dark',
    watchedAt: 1_763_000_000_000,
  },
  profileName: 'Koen',
  recent: [],
  resumeFrom: null,
  status: 'ok',
  sync: null,
  total: 2542,
  unresolvedCount: 0,
  week: [],
};

const SIGNED_OUT: ConnectionStatus = {
  ...CONNECTED,
  lastSyncedAt: 1_763_100_000_000,
  status: 'signed-out',
};

const fetchMock = vi.fn();
const sendMessage = vi.fn();
/** The server's call on this browser */
let browser: BrowserSupport = 'supported';

type Reply = (answer: unknown) => void;

/**
 * The extension in this browser: answers a ping, and a link with
 * `linkReply` (undefined: never; a function: it answers when it likes)
 */
const withExtension = (linkReply?: unknown) => {
  sendMessage.mockImplementation(
    (_id: string, message: { type: string }, reply: Reply) => {
      if (message.type === 'ping') {
        reply({ installed: true, services: ['netflix'], version: '0.3.0' });
      } else if (typeof linkReply === 'function') {
        linkReply(reply);
      } else if (linkReply !== undefined) {
        reply(linkReply);
      }
    },
  );
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
};

/** Renders, then lets the browser check (the extension's ping) settle */
const show = async (ui: ReactNode) => {
  const view = render(ui);
  await act(async () => {});
  return view;
};

/**
 * The API behind the card: codes that live `ttl` ms (4829 first, then
 * 4830…), and the link once `linked()`
 */
const serve = (linked: () => unknown = () => NOT_CONNECTED, ttl = 60_000) => {
  let next = 4829;
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const code = String(next);
      next += 1;
      return Response.json(
        { code, expiresAt: Date.now() + ttl },
        { status: 201 },
      );
    }
    if (init?.method === 'DELETE') {
      return new Response(null, { status: 204 });
    }
    return Response.json(linked());
  });
};

const connect = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Connect Netflix' }));
  });
};

const statusPolls = () =>
  fetchMock.mock.calls.filter(([url]) => url === '/api/connections/netflix')
    .length;

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockReset();
  sendMessage.mockReset();
  showToast.mockReset();
  browser = 'supported';
  vi.stubGlobal('fetch', fetchMock);
  withExtension();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ServicePanel', () => {
  it('paints the server’s status without a fetch of its own', async () => {
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    expect(screen.getByText('Not connected')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts the pairing in the card on Connect', async () => {
    serve();
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();

    expect(fetchMock).toHaveBeenCalledWith('/api/connections/link-code', {
      body: JSON.stringify({ service: 'netflix' }),
      method: 'POST',
    });
    expect(screen.getByLabelText('Your code: 4 8 2 9')).toBeTruthy();
    expect(screen.getByText('Waiting for the extension')).toBeTruthy();
    expect(screen.getByText(/^Valid for/)).toBeTruthy();
    // Pairing is not live: no red panel, the pill still says Available
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('says so when no code comes back', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 'nope' }));
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
    expect(
      screen.getByRole('button', { name: 'Connect Netflix' }),
    ).toBeTruthy();
  });

  it('waits for the first sync on a fresh link, neutral like Plex', async () => {
    await show(
      <ServicePanel browser={browser} service="netflix" status={CONNECTED} />,
    );
    expect(screen.getByText('Waiting for the first sync · Koen')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(
      screen.getByText('Koen · 2,542 episodes in its history'),
    ).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('No sync has run yet.');
  });

  it('names the profile and its history for Netflix and Prime Video', async () => {
    for (const [service, title] of [
      ['netflix', 'Netflix profile'],
      ['prime', 'Prime Video profile'],
    ] as const) {
      const { unmount } = await show(
        <ServicePanel browser={browser} service={service} status={CONNECTED} />,
      );
      expect(screen.getByText(title)).toBeTruthy();
      unmount();
    }
  });

  // iPlayer has no profiles: its reader stores none, so the card shows no row
  it('shows no profile row for BBC iPlayer', async () => {
    await show(
      <ServicePanel
        browser={browser}
        service="bbc"
        status={{ ...CONNECTED, profileName: null }}
      />,
    );
    expect(screen.queryByText('BBC iPlayer profile')).toBeNull();
    expect(screen.queryByText(/episodes in its history/)).toBeNull();
    expect(screen.getByText('Dark')).toBeTruthy();
  });

  it('turns live once a sync has run', async () => {
    const synced = { ...CONNECTED, lastSyncedAt: 1_763_100_000_000 };
    await show(
      <ServicePanel browser={browser} service="netflix" status={synced} />,
    );
    expect(screen.getByText(/^Syncing · Koen · last sync/)).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('disconnects behind a confirm, then shows the refreshed status', async () => {
    disconnectConnection.mockResolvedValue({ data: undefined, ok: true });
    const { rerender } = await show(
      <ServicePanel browser={browser} service="netflix" status={CONNECTED} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Disconnect Netflix' }),
      );
    });
    expect(disconnectConnection).toHaveBeenCalledTimes(1);

    // The action's refresh() hands the card the new status
    await act(async () => {
      rerender(
        <ServicePanel
          browser={browser}
          service="netflix"
          status={NOT_CONNECTED}
        />,
      );
    });
    expect(screen.getByText('Not connected')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Connect Netflix' }),
    ).toBeTruthy();
  });

  it('flips to connected when the poll sees the link land', async () => {
    vi.useFakeTimers();
    let linked = false;
    serve(() => (linked ? CONNECTED : NOT_CONNECTED));
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(screen.getByLabelText('Your code: 4 8 2 9')).toBeTruthy();

    linked = true;
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Waiting for the first sync · Koen')).toBeTruthy();
    // the server's status takes over
    expect(refresh).toHaveBeenCalled();
  });

  it('ignores a poll answer that isn’t a status', async () => {
    vi.useFakeTimers();
    serve(() => ({ connected: true }));
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Waiting for the extension')).toBeTruthy();
  });

  it('stops polling once the code has expired', async () => {
    vi.useFakeTimers();
    serve(undefined, 10_000);
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();

    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });
    expect(screen.getByText('Expired')).toBeTruthy();
    const polls = statusPolls();
    expect(polls).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(statusPolls()).toBe(polls);
    expect(screen.getByRole('button', { name: 'Get a new code' })).toBeTruthy();
  });

  it('revokes the code on Cancel and goes back to Connect', async () => {
    serve();
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/connections/link-code', {
      method: 'DELETE',
    });
    expect(
      screen.getByRole('button', { name: 'Connect Netflix' }),
    ).toBeTruthy();
  });

  it('copies the code and confirms with a toast, or says it couldn’t', async () => {
    serve();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(writeText).toHaveBeenCalledWith('4829');
    expect(showToast).toHaveBeenLastCalledWith({ title: 'Copied your code' });

    writeText.mockRejectedValue(new Error('denied'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
  });
});

describe('ServicePanel and the extension', () => {
  it('draws ghosts, not “Not connected” or “Available”, until the extension answers', () => {
    render(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    expect(screen.queryByText('Not connected')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Connect Netflix' }),
    ).toBeNull();
    // The state pill is its box only, hidden from screen readers
    expect(
      screen.getByText('Available').closest('[aria-hidden="true"]'),
    ).toBeTruthy();
  });

  it('is unavailable from the first paint where the extension can’t run', () => {
    browser = 'unsupported';
    // No act(): the server's call needs no browser check
    render(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText('Not available in this browser')).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(
      screen.getByText(
        'Netflix connects through the tvseri.es extension for Chrome on a computer.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Connect Netflix' }),
    ).toBeNull();
  });

  it('asks again when the tab shows, so an extension installed meanwhile is found', async () => {
    vi.stubGlobal('chrome', undefined);
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    expect(screen.getByRole('link', { name: /^Add to Chrome/ })).toBeTruthy();

    withExtension();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByRole('link', { name: /^Add to Chrome/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Connect Netflix' }),
    ).toBeTruthy();
  });

  it('drops the extension’s answer for a code that was cancelled', async () => {
    serve();
    const answers: Array<Reply> = [];
    withExtension((reply: Reply) => {
      answers.push(reply);
    });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    // A new code is on screen when the old one's answer comes back
    await connect();
    expect(screen.getByLabelText('Your code: 4 8 3 0')).toBeTruthy();
    await act(async () => {
      answers[0]?.({ ok: false, reason: 'signed-out' });
    });
    expect(
      screen.queryByText(linkFailureText(NETFLIX)['signed-out']),
    ).toBeNull();
  });

  it('leads with Add to Chrome while the extension is missing, Connect disabled with the reason', async () => {
    vi.stubGlobal('chrome', undefined);
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    // No store listing yet: Add to Chrome is /extension's manual install
    const add = screen.getByRole('link', { name: /^Add to Chrome/ });
    expect(add.getAttribute('href')).toBe(extensionInstall().href);
    const connectButton = screen.getByRole('button', {
      name: 'Connect Netflix',
    }) as HTMLButtonElement;
    expect(connectButton.disabled).toBe(true);
    expect(
      screen.getByText('Add the extension to Chrome first, then connect here.'),
    ).toBeTruthy();
  });

  it('asks for an update when the installed extension can’t connect this service', async () => {
    sendMessage.mockImplementation(
      (_id: string, message: { type: string }, reply: Reply) => {
        if (message.type === 'ping') {
          reply({ installed: true, services: ['bbc'], version: '0.1.0' });
        }
      },
    );
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Update the extension' }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Connect Netflix',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('opens How it works over the page until the service is connected', async () => {
    vi.stubGlobal('chrome', undefined);
    const { rerender } = await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    const how = screen.getByRole('button', {
      name: /^How it works\s*\(the extension\)$/,
    });
    fireEvent.click(how);
    expect(window.location.hash).toBe('#how-it-works');
    window.history.replaceState(null, '', window.location.pathname);

    rerender(
      <ServicePanel browser={browser} service="netflix" status={CONNECTED} />,
    );
    expect(
      screen.queryByRole('button', {
        name: /^How it works\s*\(the extension\)$/,
      }),
    ).toBeNull();
  });

  it('hands the code to the extension, and keeps it on screen', async () => {
    serve();
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(sendMessage).toHaveBeenCalledWith(
      'midgpplaihphccejepaigffjjlbcjkmc',
      { code: '4829', service: 'netflix', type: 'link' },
      expect.any(Function),
    );
    expect(screen.getByLabelText('Your code: 4 8 2 9')).toBeTruthy();
  });

  it('asks to confirm in the extension once it has the code, and keeps polling', async () => {
    vi.useFakeTimers();
    let linked = false;
    serve(() => (linked ? CONNECTED : NOT_CONNECTED));
    withExtension({ ok: false, reason: 'pending-consent' });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(screen.getByText('Confirm in the extension')).toBeTruthy();
    expect(screen.getByText('Code 4 8 2 9')).toBeTruthy();
    expect(screen.queryByLabelText('Your code: 4 8 2 9')).toBeNull();
    expect(
      screen.getByText('Confirm in the extension, top right of Chrome'),
    ).toBeTruthy();

    // Confirmed in the popup: the poll sees the link land
    linked = true;
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Waiting for the first sync · Koen')).toBeTruthy();
  });

  it('hears when the viewer cancels in the extension, and says so', async () => {
    vi.useFakeTimers();
    serve(() => NOT_CONNECTED);
    sendMessage.mockImplementation(
      (_id: string, message: { type: string }, reply: Reply) => {
        if (message.type === 'ping') {
          reply({ installed: true, services: ['netflix'], version: '0.3.0' });
        } else if (message.type === 'link') {
          reply({ ok: false, reason: 'pending-consent' });
        } else if (message.type === 'request-state') {
          reply({ state: 'declined' });
        }
      },
    );
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(screen.getByText('Confirm in the extension')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.queryByText('Confirm in the extension')).toBeNull();
    expect(
      screen.getByText(
        'Cancelled in the extension. Press Connect to try again.',
      ),
    ).toBeTruthy();
  });

  it('tells the extension when the card’s Cancel drops the code', async () => {
    serve();
    withExtension({ ok: false, reason: 'pending-consent' });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(sendMessage).toHaveBeenCalledWith(
      'midgpplaihphccejepaigffjjlbcjkmc',
      { code: '4829', type: 'cancel' },
      expect.any(Function),
    );
  });

  it('offers a new code once a code waiting in the extension expires', async () => {
    vi.useFakeTimers();
    serve(undefined, 5000);
    withExtension({ ok: false, reason: 'pending-consent' });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(screen.getByText('Confirm in the extension')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText('Confirm in the extension')).toBeNull();
    expect(screen.getByRole('button', { name: 'Get a new code' })).toBeTruthy();
  });

  it('says why the extension couldn’t link, in the popup’s words', async () => {
    serve();
    withExtension({ ok: false, reason: 'signed-out' });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(
      screen.getByText(linkFailureText(NETFLIX)['signed-out']),
    ).toBeTruthy();
    expect(screen.getByLabelText('Your code: 4 8 2 9')).toBeTruthy();
  });

  it('checks at once when the extension says it linked', async () => {
    serve(() => CONNECTED);
    withExtension({ ok: true, profile: 'Koen' });
    await show(
      <ServicePanel
        browser={browser}
        service="netflix"
        status={NOT_CONNECTED}
      />,
    );
    await connect();
    expect(screen.getByText('Waiting for the first sync · Koen')).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it('asks to reconnect once Netflix signs the session out', async () => {
    await show(
      <ServicePanel browser={browser} service="netflix" status={SIGNED_OUT} />,
    );
    expect(screen.getByText('Netflix signed you out · reconnect')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy();
  });

  it('shows a later sign-out once the server has caught up with a relink', async () => {
    vi.useFakeTimers();
    let linked = false;
    serve(() => (linked ? CONNECTED : SIGNED_OUT));
    const { rerender } = await show(
      <ServicePanel browser={browser} service="netflix" status={SIGNED_OUT} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Connect again' }));
    });
    linked = true;
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Waiting for the first sync · Koen')).toBeTruthy();

    // The refresh lands the link, then a later one says Netflix signed it out
    await act(async () => {
      rerender(
        <ServicePanel browser={browser} service="netflix" status={CONNECTED} />,
      );
    });
    await act(async () => {
      rerender(
        <ServicePanel
          browser={browser}
          service="netflix"
          status={SIGNED_OUT}
        />,
      );
    });
    expect(screen.getByText('Netflix signed you out · reconnect')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect again' })).toBeTruthy();
  });

  it('keeps pairing while the poll still sees the signed-out link', async () => {
    vi.useFakeTimers();
    serve(() => SIGNED_OUT);
    await show(
      <ServicePanel browser={browser} service="netflix" status={SIGNED_OUT} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Connect again' }));
    });
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Waiting for the extension')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
