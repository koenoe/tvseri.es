import { describe, expect, it } from 'vitest';

import {
  cookieJar,
  cookiesFromSecret,
  jarHeader,
  secretFromCookies,
} from './jar';

const cookie = (name: string, domain: string) => ({
  domain,
  expiresDate: null,
  httpOnly: true,
  name,
  path: '/',
  sameSite: null,
  secure: true,
  value: `${name}-value`,
});

describe('jarHeader', () => {
  it('sends only the site’s cookies, its subdomains included', () => {
    expect(
      jarHeader(
        [
          cookie('ckns_id', '.bbc.co.uk'),
          cookie('other', '.example.com'),
          cookie('lookalike', 'notbbc.co.uk'),
          cookie('ckns_atkn', 'session.bbc.co.uk'),
        ],
        'bbc.co.uk',
      ),
    ).toBe('ckns_id=ckns_id-value; ckns_atkn=ckns_atkn-value');
  });
});

describe('the stored secret', () => {
  it('round-trips the jar', () => {
    const jar = [cookie('session-token', '.primevideo.com')];
    expect(cookiesFromSecret(secretFromCookies(jar))).toEqual(jar);
  });

  it('is null for anything that isn’t a jar', () => {
    expect(cookiesFromSecret('not json')).toBeNull();
    expect(cookiesFromSecret('[{"name":1}]')).toBeNull();
  });
});

describe('cookieJar', () => {
  it('sends the site’s cookies as the service last renewed them', () => {
    const jar = cookieJar(
      [
        {
          domain: '.primevideo.com',
          expiresDate: null,
          httpOnly: true,
          name: 'session-token',
          path: '/',
          sameSite: null,
          secure: true,
          value: 'old',
        },
      ],
      'primevideo.com',
    );
    expect(jar.renewed()).toBe(false);
    jar.renew([]);
    expect(jar.renewed()).toBe(false);
    jar.renew(['session-token=new; Path=/; Secure; HttpOnly', 'ubid=1']);
    expect(jar.renewed()).toBe(true);
    expect(jar.header()).toBe('session-token=new; ubid=1');
  });
});
