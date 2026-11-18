import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getViewer = vi.fn();
vi.mock('@/auth/viewer', () => ({
  getViewer: (...a: unknown[]) => getViewer(...a),
}));

import { forwardExport } from './forward';

const REQ = new Request('https://www.tvseri.es/api/me/export/history.csv', {
  headers: { 'sec-fetch-site': 'same-origin' },
}) as unknown as NextRequest;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('API_URL', 'https://api.example.com/');
  vi.stubEnv('API_KEY', 'key');
  vi.stubGlobal('fetch', fetchMock);
  getViewer.mockResolvedValue({
    accessToken: 'session-token',
    id: 'U1',
    role: 'user',
  });
});

afterEach(() => {
  fetchMock.mockReset();
  getViewer.mockReset();
});

describe('forwardExport', () => {
  it('answers 403 to another site without reading the session', async () => {
    const crossSite = new Request(
      'https://www.tvseri.es/api/me/export/history.csv',
      { headers: { 'sec-fetch-site': 'cross-site' } },
    ) as unknown as NextRequest;
    const res = await forwardExport(crossSite, 'history.csv');
    expect(res.status).toBe(403);
    expect(getViewer).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 401 without calling the API when signed out', async () => {
    getViewer.mockResolvedValue(null);
    const res = await forwardExport(REQ, 'history.csv');
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('streams the API’s body with its attachment name, never cached', async () => {
    fetchMock.mockResolvedValue(
      new Response('title,season\n', {
        headers: {
          'content-disposition':
            'attachment; filename="tvseries-history-2026-11-12.csv"',
          'content-type': 'text/csv',
        },
      }),
    );
    const res = await forwardExport(REQ, 'history.csv');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('title,season\n');
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="tvseries-history-2026-11-12.csv"',
    );
    expect(res.headers.get('content-type')).toBe('text/csv');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('forwards only the viewer’s own token, to the one export route', async () => {
    fetchMock.mockResolvedValue(new Response('{}'));
    await forwardExport(REQ, 'everything.json');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/me/export/everything.json');
    expect(init.headers).toMatchObject({
      authorization: 'Bearer session-token',
      'x-api-key': 'key',
    });
    expect(init.cache).toBe('no-store');
  });

  it('says 413 for an export that is too large', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 413 }));
    const res = await forwardExport(REQ, 'everything.json');
    expect(res.status).toBe(413);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('maps an upstream 401 to 401 and any other failure to 502', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    expect((await forwardExport(REQ, 'history.csv')).status).toBe(401);
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await forwardExport(REQ, 'history.csv')).status).toBe(502);
    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect((await forwardExport(REQ, 'history.csv')).status).toBe(502);
  });

  it('passes the API’s AccountGone through, so the browser forgets the viewer', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'AccountGone' }, { status: 401 }),
    );
    const res = await forwardExport(REQ, 'history.csv');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'AccountGone' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
});
