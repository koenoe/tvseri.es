import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const latest = vi.hoisted(() => vi.fn());
vi.mock('./latestYear', () => ({ latestStatsYear: latest }));

const get = (username: string) =>
  GET(new Request(`https://www.tvseri.es/api/stats/${username}`), {
    params: Promise.resolve({ username }),
  });

describe('GET /api/stats/:username', () => {
  beforeEach(() => latest.mockReset());

  it('gives the newest year with stats, CDN-cached', async () => {
    latest.mockResolvedValue(2025);
    const res = await get('margaux');
    expect(await res.json()).toEqual({ year: 2025 });
    expect(res.headers.get('cache-control')).toContain('public');
    expect(latest).toHaveBeenCalledWith('margaux');
  });

  it('gives null for a user without stats', async () => {
    latest.mockResolvedValue(null);
    expect(await (await get('new-person')).json()).toEqual({ year: null });
  });

  it('says so for no such user, so the 401 claims nothing about them', async () => {
    latest.mockResolvedValue('no-user');
    const res = await get('qa-no-such-user');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ year: null });
    expect(res.headers.get('cache-control')).toContain('public');
  });

  it('never asks the API about a malformed name', async () => {
    const res = await get('a/b');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ year: null });
    expect(latest).not.toHaveBeenCalled();
  });

  it('answers 502 when the API could not say', async () => {
    latest.mockResolvedValue({ unavailable: true });
    const res = await get('margaux');
    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
