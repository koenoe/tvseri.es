import { describe, expect, it, vi } from 'vitest';

import {
  isPosterHost,
  loadPoster,
  MAX_POSTER_BYTES,
  missesPoster,
  posterSource,
} from './posters';

const API = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/abc.jpg';
const LOCAL = 'http://localhost:3190/img/stats/st_p_traitors.jpg';

describe('posterSource', () => {
  it('takes w185 for the small posters and w342 for the big ones', () => {
    expect(posterSource(API, 104)).toBe(
      'https://image.tmdb.org/t/p/w185/abc.jpg',
    );
    expect(posterSource(API, 331)).toBe(
      'https://image.tmdb.org/t/p/w342/abc.jpg',
    );
  });

  it('leaves other images alone', () => {
    expect(posterSource(LOCAL, 331)).toBe(LOCAL);
    const other = 'https://image.tmdb.org/t/p/w500/abc.png';
    expect(posterSource(other, 331)).toBe(other);
  });
});

describe('isPosterHost', () => {
  it('allows TMDB over https and a local stub over http', () => {
    expect(isPosterHost('https://image.tmdb.org/t/p/w185/abc.jpg')).toBe(true);
    expect(isPosterHost(LOCAL)).toBe(true);
    expect(isPosterHost('http://127.0.0.1:3190/img/a.jpg')).toBe(true);
  });

  it('refuses every other host, scheme and port', () => {
    expect(isPosterHost('http://image.tmdb.org/t/p/w185/abc.jpg')).toBe(false);
    expect(isPosterHost('https://image.tmdb.org:8443/t/p/a.jpg')).toBe(false);
    expect(isPosterHost('https://example.com/a.jpg')).toBe(false);
    expect(isPosterHost('https://image.tmdb.org.example.com/a.jpg')).toBe(
      false,
    );
    expect(isPosterHost('http://localhost:@example.com/a.jpg')).toBe(false);
    expect(isPosterHost('https://localhost/a.jpg')).toBe(false);
    expect(isPosterHost('http://169.254.169.254/latest')).toBe(false);
    expect(isPosterHost('file:///etc/passwd')).toBe(false);
    expect(isPosterHost('not a url')).toBe(false);
  });
});

const jpeg = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Response(body, {
    headers: { 'content-type': 'image/jpeg', ...headers },
  });

describe('loadPoster', () => {
  it('reads an allowed poster as a data URL', async () => {
    const fetch = vi.fn(async () => jpeg(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', fetch);
    await expect(loadPoster(API, 104)).resolves.toBe(
      'data:image/jpeg;base64,AQID',
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/w185/abc.jpg',
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('never fetches from another host', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(loadPoster('https://example.com/a.jpg', 104)).resolves.toBe(
      null,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a body that says it is too big', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jpeg(new Uint8Array(4), {
          'content-length': String(MAX_POSTER_BYTES + 1),
        }),
      ),
    );
    await expect(loadPoster(API, 104)).resolves.toBeNull();
  });

  it('stops reading a body past the cap', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jpeg(body)),
    );
    await expect(loadPoster(API, 104)).resolves.toBeNull();
    expect(sent).toBeLessThan(5);
  });

  it('is null for an error or a non-image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })),
    );
    await expect(loadPoster(API, 104)).resolves.toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      ),
    );
    await expect(loadPoster(API, 104)).resolves.toBeNull();
  });

  it('is null when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(loadPoster(API, 104)).resolves.toBeNull();
  });
});

describe('missesPoster', () => {
  it('is true when a show with a poster has none on the card', () => {
    expect(missesPoster([API, API], ['data:a', null])).toBe(true);
  });

  it('is false when every poster arrived or the show has none', () => {
    expect(missesPoster([API, null], ['data:a', null])).toBe(false);
    expect(missesPoster([], [])).toBe(false);
  });
});
