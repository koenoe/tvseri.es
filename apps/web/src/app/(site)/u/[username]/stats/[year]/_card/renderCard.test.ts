import { cacheLife, cacheTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCardData } from './cardData';
import { drawCard } from './draw';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./cardData', () => ({ getCardData: vi.fn() }));
vi.mock('./draw', () => ({ drawCard: vi.fn() }));

const { renderCardImage } = await import('./renderCard');

const image = new Uint8Array([0xff, 0xd8]);
const ready = {
  colour: null,
  model: {},
  status: 'ready',
  userId: 'stub-user-nina',
} as unknown as Awaited<ReturnType<typeof getCardData>>;

const render = () => renderCardImage('nina', 2025, 'square', 'dark', false);

beforeEach(() => {
  vi.mocked(cacheLife).mockClear();
  vi.mocked(cacheTag).mockClear();
  vi.mocked(drawCard).mockReset();
  vi.mocked(getCardData).mockReset();
});

describe('renderCardImage', () => {
  it('keeps a full card for the stats profile, tagged with the user', async () => {
    vi.mocked(getCardData).mockResolvedValue(ready);
    vi.mocked(drawCard).mockResolvedValue({ degraded: false, image });
    await expect(render()).resolves.toEqual({ degraded: false, image });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['stats']]);
    expect(vi.mocked(cacheTag).mock.calls.flat()).toEqual([
      'username:nina',
      'user:stub-user-nina',
      'stats:stub-user-nina',
    ]);
  });

  it('keeps a card with a failed poster for the unavailable profile only', async () => {
    vi.mocked(getCardData).mockResolvedValue(ready);
    vi.mocked(drawCard).mockResolvedValue({ degraded: true, image });
    await expect(render()).resolves.toEqual({ degraded: true, image });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
  });

  it('tags a year without episodes with the user, so a mark expires it', async () => {
    vi.mocked(getCardData).mockResolvedValue({
      status: 'not-found',
      userId: 'stub-user-nina',
    });
    await expect(render()).resolves.toBe('not-found');
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['stats']]);
    expect(vi.mocked(cacheTag).mock.calls.flat()).toContain(
      'stats:stub-user-nina',
    );
    expect(drawCard).not.toHaveBeenCalled();
  });

  it('keeps an unknown user briefly, tagged with the username', async () => {
    vi.mocked(getCardData).mockResolvedValue({
      status: 'not-found',
      userId: null,
    });
    await expect(render()).resolves.toBe('not-found');
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
    expect(vi.mocked(cacheTag).mock.calls.flat()).toEqual(['username:nina']);
  });

  it('keeps a failed read briefly', async () => {
    vi.mocked(getCardData).mockResolvedValue('unavailable');
    await expect(render()).resolves.toBe('unavailable');
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['unavailable']]);
  });
});
