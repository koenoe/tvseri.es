import { LambdaClient } from '@aws-sdk/client-lambda';
import { describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';

/**
 * A network's logo carries `logoSilhouette`: whether it reads as a white
 * silhouette, checked once per logo path by the image Lambda and stored
 * for good.
 */

const key = (path: string) => `CACHE#detectLogoSilhouette:v1:${path}`;

/** The image Lambda answers the logo check; returns the spy */
const lambdaAnswers = (silhouette: boolean) =>
  vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async () => ({
    Payload: new TextEncoder().encode(JSON.stringify({ silhouette })),
  }));

const payloads = (send: ReturnType<typeof lambdaAnswers>) =>
  send.mock.calls.map(([command]) =>
    JSON.parse(
      String(
        (command as Readonly<{ input: { Payload: string } }>).input.Payload,
      ),
    ),
  );

const showOnNetwork = (id: number, logoPath: string | null) =>
  fakeShow({
    extra: { networks: [{ id: 290, logo_path: logoPath, name: 'TF1' }] },
    id,
    seasons: [{ airDate: '2015-10-19', episodes: 1 }],
  });

type Body = Readonly<{
  logo?: unknown;
  logoSilhouette?: unknown;
  network?: Readonly<{ logo: string; logoSilhouette?: boolean }>;
}>;

const seriesNetwork = async (id: number) =>
  ((await (await request(`/series/${id}`)).json()) as Body).network;

describe("a show's network logo", () => {
  it('is checked by the image Lambda at w500 and stored for good', async () => {
    const send = lambdaAnswers(false);
    showOnNetwork(1, '/tf1.png');

    expect(await seriesNetwork(1)).toMatchObject({
      logo: 'https://image.tmdb.org/t/p/w500/tf1.png',
      logoSilhouette: false,
    });
    expect(payloads(send)).toEqual([
      { mode: 'logo', url: 'https://image.tmdb.org/t/p/w500/tf1.png' },
    ]);
    const [stored] = db.dump('Cache');
    expect(stored).toMatchObject({ pk: key('/tf1.png'), value: 'false' });
    expect(stored).not.toHaveProperty('expiresAt');
  });

  it('is read from the cache without calling the Lambda again', async () => {
    const send = lambdaAnswers(false);
    db.seed('Cache', [{ pk: key('/hbo.png'), value: 'true' }]);
    showOnNetwork(2, '/hbo.png');

    expect((await seriesNetwork(2))?.logoSilhouette).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('has no answer when the check fails, and nothing is stored', async () => {
    showOnNetwork(3, '/down.png');

    const network = await seriesNetwork(3);

    expect(network).toBeDefined();
    expect(network).not.toHaveProperty('logoSilhouette');
    expect(db.dump('Cache')).toEqual([]);
  });

  it('is not checked when the network has no logo', async () => {
    const send = lambdaAnswers(true);
    showOnNetwork(4, null);

    expect(await seriesNetwork(4)).toEqual({ id: 290, logo: '', name: 'TF1' });
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores an answer without the logo field (a Lambda from before the check)', async () => {
    vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async () => ({
      Payload: new TextEncoder().encode(JSON.stringify({ color: '#123456' })),
    }));
    showOnNetwork(5, '/old.png');

    expect(await seriesNetwork(5)).not.toHaveProperty('logoSilhouette');
    expect(db.dump('Cache')).toEqual([]);
  });
});

describe('GET /network/:id', () => {
  it('carries the logo check', async () => {
    lambdaAnswers(false);
    onTmdb('/network/290', {
      id: 290,
      logo_path: '/tf1.png',
      name: 'TF1',
      origin_country: 'FR',
    });

    const body = (await (await request('/network/290')).json()) as Body;

    expect(body.logo).toBe('https://image.tmdb.org/t/p/w500/tf1.png');
    expect(body.logoSilhouette).toBe(false);
  });
});
