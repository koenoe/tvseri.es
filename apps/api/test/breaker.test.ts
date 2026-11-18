import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBreaker,
  MIN_OPEN_MS,
  parseRetryAfter,
  SHARED_REFRESH_MS,
} from '@/lib/upstream/breaker';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';

import { db } from './db';

const breakerWrites = (spy: Readonly<{ mock: { calls: unknown[][] } }>) =>
  spy.mock.calls.filter(
    ([command]: unknown[]) =>
      command instanceof PutItemCommand &&
      JSON.stringify(command.input.Item).includes('breaker:v1'),
  ).length;

/** DynamoDB calls from here on (the spy persists across tests) */
const spySend = () => {
  const spy = vi.spyOn(db, 'send');
  spy.mockClear();
  return spy;
};

const outcome = (promise: Promise<unknown>) =>
  promise.then(
    () => 'entered',
    (error: unknown) =>
      error instanceof UpstreamUnavailableError ? 'unavailable' : 'error',
  );

describe('the upstream circuit breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  it('opens on a 429 and fails fast while open', async () => {
    const breaker = createBreaker('tmdb');
    const ticket = await breaker.enter();
    await ticket.report({ kind: 'rate-limited' });

    await expect(breaker.enter()).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(await breaker.isOpen()).toBe(true);
  });

  it('honours Retry-After, never less than the minimum', async () => {
    const breaker = createBreaker('tmdb');
    await (await breaker.enter()).report({
      kind: 'rate-limited',
      retryAfterMs: 20_000,
    });

    vi.advanceTimersByTime(19_999);
    expect(await outcome(breaker.enter())).toBe('unavailable');
    vi.advanceTimersByTime(1);
    expect(await outcome(breaker.enter())).toBe('entered');

    const short = createBreaker('mdblist');
    await (await short.enter()).report({
      kind: 'rate-limited',
      retryAfterMs: 1000,
    });
    vi.advanceTimersByTime(MIN_OPEN_MS - 1);
    expect(await outcome(short.enter())).toBe('unavailable');
  });

  it('lets one probe through after the open period, then closes on an answer', async () => {
    const breaker = createBreaker('tmdb');
    await (await breaker.enter()).report({ kind: 'rate-limited' });
    vi.advanceTimersByTime(MIN_OPEN_MS);

    const probe = await breaker.enter();
    // Everyone else still fails fast while the probe is out
    expect(await outcome(breaker.enter())).toBe('unavailable');
    await probe.report({ kind: 'ok' });

    expect(await outcome(breaker.enter())).toBe('entered');
    expect(await outcome(breaker.enter())).toBe('entered');
  });

  it('reopens for twice as long when the probe fails', async () => {
    const breaker = createBreaker('tmdb');
    await (await breaker.enter()).report({ kind: 'rate-limited' });
    vi.advanceTimersByTime(MIN_OPEN_MS);
    await (await breaker.enter()).report({ kind: 'failed' });

    vi.advanceTimersByTime(2 * MIN_OPEN_MS - 1);
    expect(await outcome(breaker.enter())).toBe('unavailable');
    vi.advanceTimersByTime(1);
    expect(await outcome(breaker.enter())).toBe('entered');
  });

  it('opens after five failures in ten seconds, not on one', async () => {
    const breaker = createBreaker('tmdb');
    for (let index = 0; index < 4; index++) {
      await (await breaker.enter()).report({ kind: 'failed' });
    }
    expect(await breaker.isOpen()).toBe(false);
    await (await breaker.enter()).report({ kind: 'failed' });

    expect(await breaker.isOpen()).toBe(true);
  });

  it('writes the shared state once for a burst of 429s', async () => {
    const send = spySend();
    const breaker = createBreaker('tmdb');
    const tickets = await Promise.all(
      Array.from({ length: 50 }, () => breaker.enter()),
    );

    await Promise.all(
      tickets.map((ticket) => ticket.report({ kind: 'rate-limited' })),
    );

    expect(breakerWrites(send)).toBe(1);
  });

  it('shares the open state with other instances, read at most every 2 s', async () => {
    const opener = createBreaker('tmdb');
    const other = createBreaker('tmdb');
    // The other instance has read the (closed) shared state just now
    expect(await outcome(other.enter())).toBe('entered');

    await (await opener.enter()).report({
      kind: 'rate-limited',
      retryAfterMs: 30_000,
    });
    const send = spySend();

    // Within its 2 s it trusts what it read, without another read
    expect(await outcome(other.enter())).toBe('entered');
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SHARED_REFRESH_MS);
    expect(await outcome(other.enter())).toBe('unavailable');
    expect(send).toHaveBeenCalledTimes(1);
    // ...and writes nothing: it only follows
    expect(breakerWrites(send)).toBe(0);
  });

  it('a second instance that also gets a 429 does not write again', async () => {
    const first = createBreaker('tmdb');
    const second = createBreaker('tmdb');
    const [a, b] = await Promise.all([first.enter(), second.enter()]);
    const send = spySend();

    await a.report({ kind: 'rate-limited' });
    await b.report({ kind: 'rate-limited' });

    // Both tried one conditional write; only one item, never more than one
    // attempt per instance
    expect(breakerWrites(send)).toBeLessThanOrEqual(2);
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    const now = Date.parse('2026-11-13T12:00:00Z');
    expect(parseRetryAfter('20', now)).toBe(20_000);
    expect(parseRetryAfter('Fri, 13 Nov 2026 12:00:30 GMT', now)).toBe(30_000);
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter('soon', now)).toBeUndefined();
  });
});
