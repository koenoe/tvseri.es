import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ default: auth }));

import { GET } from './route';

const request = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/region', { headers });

describe('GET /api/region', () => {
  beforeEach(() => {
    auth.mockReset();
  });

  it("answers the visitor's geo country, private for a day", async () => {
    auth.mockResolvedValue({ user: null });
    const response = await GET(request({ 'x-vercel-ip-country': 'NL' }));
    expect(await response.json()).toEqual({ region: 'NL' });
    expect(response.headers.get('cache-control')).toBe(
      'private, max-age=86400',
    );
  });

  it("prefers the signed-in viewer's saved country", async () => {
    auth.mockResolvedValue({ user: { country: 'DE' } });
    const response = await GET(request({ 'x-vercel-ip-country': 'NL' }));
    expect(await response.json()).toEqual({ region: 'DE' });
  });

  it('falls back to US without a geo header (local runs)', async () => {
    auth.mockResolvedValue({ user: null });
    const response = await GET(request());
    expect(await response.json()).toEqual({ region: 'US' });
  });
});
