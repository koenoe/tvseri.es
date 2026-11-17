import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMe } from '@/auth/me';
import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

import { importStatus, startImport, undoImport } from './actions';

vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/auth/me', () => ({ fetchMe: vi.fn() }));
vi.mock('@/lib/stats/revalidateViewerStats', () => ({
  revalidateViewerStats: vi.fn(),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const VIEWER = {
  accessToken: 'session-token',
  id: 'USER-SESSION',
  role: 'user',
} as const;
const IMPORT_ID = '0b2f4c1e-6f0e-4a55-8d57-3f2f9d3c8a11';

beforeEach(() => {
  vi.mocked(revalidateViewerStats).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(getViewer).mockResolvedValue(VIEWER);
});

describe('startImport', () => {
  it('creates the session user’s import and returns its id and time', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      createdAt: 1,
      importId: IMPORT_ID,
      written: 0,
    });
    await expect(startImport()).resolves.toMatchObject({
      data: { createdAt: 1, importId: IMPORT_ID },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/me/imports', {
      accessToken: 'session-token',
      method: 'POST',
    });
  });

  it('signed out: unauthenticated, no call', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    await expect(startImport()).resolves.toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('an API failure is `failed`, never the raw error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500, 'Dynamo exploded'));
    await expect(startImport()).resolves.toEqual({
      error: 'failed',
      ok: false,
    });
  });

  it('a 401 from the API is unauthenticated', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(401));
    await expect(startImport()).resolves.toEqual({
      error: 'unauthenticated',
      ok: false,
    });
  });
  it('a 409 is `undoing`: the last import’s Undo still runs', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(409));
    await expect(startImport()).resolves.toEqual({
      error: 'undoing',
      ok: false,
    });
  });
});

describe('undoImport', () => {
  it('undoes the import on the session user’s token, no user id anywhere', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ status: 'queued' });
    const result = await undoImport(IMPORT_ID);
    expect(result).toMatchObject({
      data: { requestedAt: expect.any(Number) },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/me/imports/:importId', {
      accessToken: 'session-token',
      method: 'DELETE',
      params: { importId: IMPORT_ID },
    });
    expect(JSON.stringify(vi.mocked(apiFetch).mock.calls)).not.toContain(
      VIEWER.id,
    );
  });

  it('refreshes the viewer’s stats once the API took the Undo', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ status: 'queued' });
    await undoImport(IMPORT_ID);
    expect(revalidateViewerStats).toHaveBeenCalledTimes(1);
    expect(revalidateViewerStats).toHaveBeenCalledWith(VIEWER.id);
  });

  it('409 (not the last import, or already undone) is invalid', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(409, 'ImportNotOpen'));
    await expect(undoImport(IMPORT_ID)).resolves.toEqual({
      error: 'invalid',
      ok: false,
    });
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('refuses an id that is not a UUID before any call', async () => {
    for (const bad of [
      '',
      'x'.repeat(65),
      'imp-1',
      `${IMPORT_ID}x`,
      '../user/other',
    ]) {
      await expect(undoImport(bad)).resolves.toEqual({
        error: 'invalid',
        ok: false,
      });
    }
    await expect(undoImport(42 as never)).resolves.toEqual({
      error: 'invalid',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('signed out: unauthenticated, no call', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    await expect(undoImport(IMPORT_ID)).resolves.toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('importStatus', () => {
  const lastImport = {
    createdAt: 1,
    importId: IMPORT_ID,
    undoneAt: 5,
    written: 3,
  };

  it('reads the last import of the session user', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ lastImport } as never);
    await expect(importStatus()).resolves.toMatchObject({
      data: { lastImport },
      ok: true,
    });
    expect(fetchMe).toHaveBeenCalledWith('session-token');
  });

  it('the queued Undo is done: the viewer’s stats refresh again', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ lastImport } as never);
    await importStatus();
    expect(revalidateViewerStats).toHaveBeenCalledWith(VIEWER.id);

    vi.mocked(revalidateViewerStats).mockReset();
    vi.mocked(fetchMe).mockResolvedValue({
      lastImport: { ...lastImport, undoneAt: undefined },
    } as never);
    await importStatus();
    expect(revalidateViewerStats).not.toHaveBeenCalled();
  });

  it('no import yet: null', async () => {
    vi.mocked(fetchMe).mockResolvedValue({} as never);
    await expect(importStatus()).resolves.toMatchObject({
      data: { lastImport: null },
      ok: true,
    });
  });

  it('signed out, or an unknown user: unauthenticated', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    await expect(importStatus()).resolves.toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    vi.mocked(getViewer).mockResolvedValue(VIEWER);
    vi.mocked(fetchMe).mockResolvedValue(null);
    await expect(importStatus()).resolves.toEqual({
      error: 'unauthenticated',
      ok: false,
    });
  });

  it('an API failure is `failed`', async () => {
    vi.mocked(fetchMe).mockRejectedValue(new ApiError(503));
    await expect(importStatus()).resolves.toEqual({
      error: 'failed',
      ok: false,
    });
  });
});
