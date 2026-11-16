import { describe, expect, it } from 'vitest';

import { stageUrls } from './stageUrls';

describe('stageUrls', () => {
  it('production: the site is www.tvseri.es', () => {
    expect(stageUrls({ stage: 'production' })).toEqual({
      domain: 'tvseri.es',
      site: 'https://www.tvseri.es',
    });
  });

  it('a PR preview: its own www on the dev domain (infra/web.ts aliases it there)', () => {
    expect(
      stageUrls({ baseDomain: 'pr-12.dev.tvseri.es', stage: 'pr-12' }),
    ).toEqual({
      domain: 'pr-12.dev.tvseri.es',
      site: 'https://www.pr-12.dev.tvseri.es',
    });
  });

  it('falls back to infra/dns.ts’s rule without BASE_DOMAIN', () => {
    expect(stageUrls({ stage: 'pr-12' }).site).toBe(
      'https://www.pr-12.dev.tvseri.es',
    );
    expect(stageUrls({ stage: 'dev' }).site).toBe('https://www.dev.tvseri.es');
  });

  it('`sst dev` (a personal stage): the site is the local Next server', () => {
    // www.alex.dev.tvseri.es has no DNS: the web of a live stage is local
    expect(
      stageUrls({
        baseDomain: 'alex.dev.tvseri.es',
        live: true,
        stage: 'alex',
      }),
    ).toEqual({
      domain: 'alex.dev.tvseri.es',
      site: 'http://localhost:3000',
    });
  });
});
