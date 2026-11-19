import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const getViewer = vi.fn();
const apiFetch = vi.fn();
const refresh = vi.fn();

vi.mock('@/auth/viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('next/cache', () => ({
  refresh: () => refresh(),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import {
  createPlexUrl,
  disconnectConnection,
  disconnectPlex,
  revealPlexUrl,
  syncConnection,
  updatePlex,
} from './actions';

const VIEWER = { accessToken: 'session-token', id: 'U1', role: 'user' };

beforeEach(() => {
  getViewer.mockReset();
  apiFetch.mockReset();
  refresh.mockReset();
  getViewer.mockResolvedValue(VIEWER);
  apiFetch.mockResolvedValue({ message: 'OK' });
});

describe('signed out', () => {
  it.each([
    ['createPlexUrl', () => createPlexUrl()],
    ['updatePlex', () => updatePlex({ paused: true })],
    ['disconnectPlex', () => disconnectPlex()],
    ['revealPlexUrl', () => revealPlexUrl()],
    ['disconnectConnection', () => disconnectConnection('netflix')],
    ['syncConnection', () => syncConnection('netflix')],
  ])('%s says unauthenticated and never calls the API', async (_n, run) => {
    getViewer.mockResolvedValue(null);
    expect(await run()).toEqual({ error: 'unauthenticated', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('destructive actions act only on the signed-in viewer', () => {
  it('New URL posts with the session token and nothing else', async () => {
    await createPlexUrl();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      method: 'POST',
      params: { type: 'plex' },
    });
  });

  it('Disconnect deletes with the session token and nothing else', async () => {
    await disconnectPlex();
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      method: 'DELETE',
      params: { type: 'plex' },
    });
  });

  it('takes no arguments from the caller', () => {
    expect(createPlexUrl.length).toBe(0);
    expect(disconnectPlex.length).toBe(0);
  });
});

describe('updatePlex', () => {
  it('sends only the validated fields with the session token', async () => {
    const result = await updatePlex({ onlyAccountId: null, paused: false });
    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      body: { onlyAccountId: null, paused: false },
      method: 'PATCH',
      params: { type: 'plex' },
    });
  });

  it.each([{}, { paused: 'yes' }, { paused: true, userId: 'U2' }, null])(
    'rejects %j without calling the API',
    async (input) => {
      expect(await updatePlex(input)).toEqual({ error: 'invalid', ok: false });
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it('maps the API errors without leaking their text', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'secret detail'));
    expect(await updatePlex({ onlyAccountId: 9 })).toEqual({
      error: 'invalid',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(404));
    expect(await updatePlex({ paused: true })).toEqual({
      error: 'not-found',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(500));
    expect(await updatePlex({ paused: true })).toEqual({
      error: 'failed',
      ok: false,
    });
  });

  it('refreshes the settings holes after a write', async () => {
    await updatePlex({ paused: true });
    expect(refresh).toHaveBeenCalled();
  });
});

describe('revealPlexUrl', () => {
  it('reads the token with the session token and returns the full URL', async () => {
    vi.stubEnv('SITE_URL', 'https://www.example.com');
    vi.stubEnv('NODE_ENV', 'production');
    apiFetch.mockResolvedValue({ token: 'a1b2c3d4e5f6a1b2c3d4e5f6' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await revealPlexUrl()).toMatchObject({
      data: {
        url: 'https://www.example.com/api/webhooks/scrobble/plex?token=a1b2c3d4e5f6a1b2c3d4e5f6',
      },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      params: { type: 'plex' },
    });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
    vi.unstubAllEnvs();
  });

  it('says not-found when no URL was created', async () => {
    apiFetch.mockResolvedValue({ token: null });
    expect(await revealPlexUrl()).toEqual({ error: 'not-found', ok: false });
  });

  it('never revalidates (a read)', async () => {
    apiFetch.mockResolvedValue({ token: 'a1b2c3d4e5f6a1b2c3d4e5f6' });
    await revealPlexUrl();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('a service’s actions', () => {
  it.each([
    ['disconnectConnection', () => disconnectConnection('hulu')],
    ['syncConnection', () => syncConnection('hulu')],
  ])(
    '%s refuses a service it can’t connect without calling the API',
    async (_n, run) => {
      expect(await run()).toEqual({ error: 'invalid', ok: false });
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );
});

describe('disconnectConnection', () => {
  it('deletes with the session token, then refreshes the card', async () => {
    expect((await disconnectConnection('netflix')).ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/me/connections/:service', {
      accessToken: 'session-token',
      method: 'DELETE',
      params: { service: 'netflix' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the card as it is when the API refuses', async () => {
    apiFetch.mockRejectedValue(new ApiError(500));
    expect(await disconnectConnection('netflix')).toMatchObject({
      error: 'failed',
      ok: false,
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('syncConnection', () => {
  const ADMIN = { ...VIEWER, role: 'admin' };

  it('queues a sync for an admin with the session token, then refreshes', async () => {
    getViewer.mockResolvedValue(ADMIN);
    apiFetch.mockResolvedValue({ state: 'queued' });
    expect(await syncConnection('netflix')).toMatchObject({ ok: true });
    expect(apiFetch).toHaveBeenCalledWith('/me/connections/:service/sync', {
      accessToken: 'session-token',
      method: 'POST',
      params: { service: 'netflix' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('passes the API’s refusal (after the first sync, not an admin) on as invalid', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'));
    expect(await syncConnection('netflix')).toEqual({
      error: 'invalid',
      ok: false,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('treats a sync already running as done: the card shows it', async () => {
    getViewer.mockResolvedValue(ADMIN);
    apiFetch.mockRejectedValue(new ApiError(409, 'Conflict'));
    expect(await syncConnection('netflix')).toMatchObject({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('says Netflix isn’t connected on a 404', async () => {
    getViewer.mockResolvedValue(ADMIN);
    apiFetch.mockRejectedValue(new ApiError(404, 'Not found'));
    expect(await syncConnection('netflix')).toEqual({
      error: 'not-found',
      ok: false,
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
