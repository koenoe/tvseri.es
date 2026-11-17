import { createServer } from 'node:net';

import { describe, expect, it, vi } from 'vitest';

import { serveOnLoopback } from '../e2e/helpers/loopback.ts';

/** A port free on both loopbacks */
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('no port')),
      );
    });
  });

describe('serveOnLoopback', () => {
  it('answers on both loopback addresses, so either one `localhost` tries first connects', async () => {
    const port = await freePort();
    const close = await serveOnLoopback(port, (_request, response) => {
      response.end('ok');
    });

    for (const host of ['127.0.0.1', '[::1]']) {
      const response = await fetch(`http://${host}:${port}/`);
      expect(await response.text()).toBe('ok');
    }
    await close();
  });

  it('answers 500 when a handler throws, and keeps serving', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const port = await freePort();
    const close = await serveOnLoopback(port, (request, response) => {
      if (request.url === '/broken') {
        throw new Error('fixture bug');
      }
      response.end('ok');
    });

    const broken = await fetch(`http://127.0.0.1:${port}/broken`);
    expect(broken.status).toBe(500);
    const next = await fetch(`http://127.0.0.1:${port}/`);
    expect(await next.text()).toBe('ok');
    await close();
  });
});
