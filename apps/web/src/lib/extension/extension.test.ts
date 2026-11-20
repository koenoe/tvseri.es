import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const NETFLIX = { name: 'Netflix', site: 'netflix.com' } as const;

import {
  type ChromeRuntime,
  EXTENSION_IDS,
  extensionInstall,
  linkFailureText,
  pingExtension,
  sendLinkCode,
} from './extension';

/** A fake `chrome.runtime`: `answer` replies per extension id (undefined: never) */
const runtimeOf = (
  answer: (id: string, message: unknown) => unknown,
  lastError?: Readonly<{ message: string }>,
): ChromeRuntime => {
  const runtime: { lastError?: Readonly<{ message: string }> } & ChromeRuntime =
    {
      sendMessage: (id, message, reply) => {
        const value = answer(id, message);
        if (value === undefined) {
          return;
        }
        queueMicrotask(() => {
          runtime.lastError = lastError;
          reply(value);
          runtime.lastError = undefined;
        });
      },
    };
  return runtime;
};

const ID = EXTENSION_IDS[0] ?? '';

afterEach(() => {
  vi.useRealTimers();
});

describe('extensionInstall', () => {
  it('installs by hand from /extension while there is no store listing', () => {
    expect(extensionInstall(null)).toEqual({
      external: false,
      href: '/extension',
    });
  });

  it('sends Add to Chrome to the listing once there is one', () => {
    const listing = 'https://chromewebstore.google.com/detail/tvseries/abc';
    expect(extensionInstall(listing)).toEqual({
      external: true,
      href: listing,
    });
  });
});

describe('pingExtension', () => {
  it('finds the extension and the services it can connect', async () => {
    const runtime = runtimeOf((_id, message) =>
      (message as { type: string }).type === 'ping'
        ? { installed: true, services: ['netflix'], version: '0.3.0' }
        : undefined,
    );
    expect(await pingExtension(runtime)).toEqual({
      id: ID,
      services: ['netflix'],
      version: '0.3.0',
    });
  });

  it('finds the store’s install as well as the hand-loaded one', async () => {
    const STORE_ID = 'gnejijlljabmdidklojkipaflnpameok';
    const runtime = runtimeOf((id, message) =>
      id === STORE_ID && (message as { type: string }).type === 'ping'
        ? { installed: true, services: ['netflix'], version: '0.3.1' }
        : null,
    );
    expect(await pingExtension(runtime)).toEqual({
      id: STORE_ID,
      services: ['netflix'],
      version: '0.3.1',
    });
  });

  it('is missing without chrome.runtime', async () => {
    expect(await pingExtension(null)).toBeNull();
  });

  it('is missing when Chrome reports no such extension', async () => {
    const runtime = runtimeOf(() => null, {
      message: 'Could not establish connection. Receiving end does not exist.',
    });
    expect(await pingExtension(runtime)).toBeNull();
  });

  it('is missing when sending throws', async () => {
    const runtime: ChromeRuntime = {
      sendMessage: () => {
        throw new Error('Invalid extension id');
      },
    };
    expect(await pingExtension(runtime)).toBeNull();
  });

  it('is missing when nothing answers in time', async () => {
    vi.useFakeTimers();
    const found = pingExtension(runtimeOf(() => undefined));
    await vi.advanceTimersByTimeAsync(5000);
    expect(await found).toBeNull();
  });

  it('ignores an answer that isn’t a ping reply', async () => {
    expect(await pingExtension(runtimeOf(() => ({ hello: 1 })))).toBeNull();
  });
});

describe('sendLinkCode', () => {
  it('hands the code to the extension and reads its answer', async () => {
    const sendMessage = vi.fn((_id: string, _message: unknown, reply) =>
      reply({ ok: true, profile: 'Koen' }),
    );
    const reply = await sendLinkCode({ sendMessage }, ID, '4829', 'netflix');
    expect(sendMessage).toHaveBeenCalledWith(
      ID,
      { code: '4829', service: 'netflix', type: 'link' },
      expect.any(Function),
    );
    expect(reply).toEqual({ ok: true, profile: 'Koen' });
  });

  it('passes a refusal on with its reason', async () => {
    const runtime = runtimeOf(() => ({ ok: false, reason: 'signed-out' }));
    expect(await sendLinkCode(runtime, ID, '4829', 'netflix')).toEqual({
      ok: false,
      reason: 'signed-out',
    });
  });

  it('passes on that the extension waits for the viewer to confirm', async () => {
    const runtime = runtimeOf(() => ({ ok: false, reason: 'pending-consent' }));
    expect(await sendLinkCode(runtime, ID, '4829', 'netflix')).toEqual({
      ok: false,
      reason: 'pending-consent',
    });
  });

  it('answers null on a timeout: the poll decides, not this', async () => {
    vi.useFakeTimers();
    const reply = sendLinkCode(
      runtimeOf(() => undefined),
      ID,
      '4829',
      'netflix',
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await reply).toBeNull();
  });
});

describe('linkFailureText', () => {
  it('says what the extension’s popup says, word for word', () => {
    // The extension has no build step, so it keeps its own copy: three
    // lines as they are, two built from the service's name and sign-in site
    const popup = readFileSync(
      new URL('../../../../extension/popup.js', import.meta.url),
      'utf8',
    );
    const text = linkFailureText(NETFLIX);
    for (const reason of ['bad-code', 'rate-limited', 'unavailable'] as const) {
      expect(popup, reason).toContain(`'${text[reason]}'`);
    }
    for (const reason of ['signed-out', 'test-read-failed'] as const) {
      const template = new RegExp(`'${reason}': \`([^\`]*)\``).exec(popup)?.[1];
      expect(
        template
          ?.replace(/\$\{name\}/g, NETFLIX.name)
          .replace(/\$\{signIn\}/g, NETFLIX.site),
        reason,
      ).toBe(text[reason]);
    }
  });

  it('names the service and where to sign in to it', () => {
    expect(linkFailureText(NETFLIX)['signed-out']).toBe(
      'This browser isn’t signed in to Netflix. Sign in on netflix.com, then try again.',
    );
  });
});
