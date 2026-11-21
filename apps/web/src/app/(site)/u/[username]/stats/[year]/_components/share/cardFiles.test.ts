import { describe, expect, it, vi } from 'vitest';

import { cardPending, prefetchCard, subscribeCards } from './cardFiles';

/** A fetch that answers when the test says so */
function stubFetch() {
  let answer: (response: Response) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          answer = resolve;
          fail = reject;
        }),
    ),
  );
  return {
    answer: (response: Response) => answer(response),
    fail: (error: Error) => fail(error),
  };
}

describe('cardPending', () => {
  it('is pending from the fetch’s start until the file arrives, telling subscribers', async () => {
    const fetch = stubFetch();
    const listener = vi.fn();
    const stop = subscribeCards(listener);
    const path = '/u/lena/stats/2025/card?format=story';

    const done = prefetchCard(path);
    expect(cardPending(path)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    fetch.answer(new Response('jpeg'));
    await done;
    expect(cardPending(path)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops being pending when the fetch fails, so Share… shares the link', async () => {
    const fetch = stubFetch();
    const path = '/u/lena/stats/2025/card?format=square';

    const done = prefetchCard(path);
    fetch.answer(new Response('down', { status: 503 }));
    await done;
    expect(cardPending(path)).toBe(false);

    // and a retry fetches it again
    const again = prefetchCard(path);
    expect(cardPending(path)).toBe(true);
    fetch.fail(new Error('offline'));
    await again;
    expect(cardPending(path)).toBe(false);
  });
});
