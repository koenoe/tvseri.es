import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readThroughDay } from '@/lib/db/cache/readThroughDay';
import { claim } from '@/lib/db/cache/singleFlight';

const key = (day: string) => `test-day:v1:${day}`;

const read = (day: string, load: () => Promise<string>) =>
  readThroughDay({ day, key, load, ttl: () => 86_400 });

describe('readThroughDay', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T12:00:00Z'));
  });

  it('builds once and serves the stored build for the day', async () => {
    const load = vi.fn(async () => 'thursday');

    expect(await read('2026-11-13', load)).toEqual({
      fallback: false,
      value: 'thursday',
    });
    expect(await read('2026-11-13', load)).toEqual({
      fallback: false,
      value: 'thursday',
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves yesterday’s build when today’s fails', async () => {
    await read('2026-11-13', async () => 'thursday');
    vi.setSystemTime(new Date('2026-11-14T00:05:00Z'));

    const result = await read('2026-11-14', async () => {
      throw new Error('TMDB down');
    });

    expect(result).toEqual({ fallback: true, value: 'thursday' });
  });

  it('keeps yesterday’s build past its own day for the fallback', async () => {
    await read('2026-11-13', async () => 'thursday');
    vi.setSystemTime(new Date('2026-11-14T23:00:00Z'));

    const result = await read('2026-11-14', async () => {
      throw new Error('TMDB down');
    });

    expect(result.value).toBe('thursday');
  });

  it('answers with yesterday’s at once while another Lambda builds today’s', async () => {
    await read('2026-11-13', async () => 'thursday');
    vi.setSystemTime(new Date('2026-11-14T00:00:10Z'));
    // Another instance won the build
    expect(await claim('build:test-day:v1:2026-11-14', 30)).toBe(true);
    const load = vi.fn(async () => 'friday');

    const result = await read('2026-11-14', load);

    expect(result).toEqual({ fallback: true, value: 'thursday' });
    expect(load).not.toHaveBeenCalled();
  });

  it('builds 50 concurrent first reads of a day once', async () => {
    await read('2026-11-13', async () => 'thursday');
    vi.setSystemTime(new Date('2026-11-14T00:00:10Z'));
    const load = vi.fn(async () => 'friday');

    const results = await Promise.all(
      Array.from({ length: 50 }, () => read('2026-11-14', load)),
    );

    expect(load).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.fallback)).toHaveLength(49);
  });

  it('builds anyway when there is nothing to fall back on', async () => {
    await claim('build:test-day:v1:2026-11-13', 30);

    expect(await read('2026-11-13', async () => 'first ever')).toEqual({
      fallback: false,
      value: 'first ever',
    });
  });

  it('throws the build’s error when there is nothing older', async () => {
    await expect(
      read('2026-11-13', async () => {
        throw new Error('TMDB down');
      }),
    ).rejects.toThrow('TMDB down');
  });
});
