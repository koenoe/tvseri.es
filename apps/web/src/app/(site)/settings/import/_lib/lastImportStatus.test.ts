import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readLastImport } from './lastImportStatus';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
});

const LAST = { createdAt: 1, importId: 'imp-1', undoneAt: 2, written: 3 };

describe('readLastImport', () => {
  it('reads the viewer’s last import from the private route', async () => {
    fetchMock.mockResolvedValue(Response.json({ lastImport: LAST }));
    await expect(readLastImport()).resolves.toEqual(LAST);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/import-status', undefined);
  });

  it('no import is null', async () => {
    fetchMock.mockResolvedValue(Response.json({ lastImport: null }));
    await expect(readLastImport()).resolves.toBeNull();
  });

  it.each([401, 403, 502, 503])(
    'a %i is unknown, never "no import"',
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: 'x', lastImport: null }, { status }),
      );
      await expect(readLastImport()).resolves.toBeUndefined();
    },
  );

  it('a network failure is unknown', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(readLastImport()).resolves.toBeUndefined();
  });
});
