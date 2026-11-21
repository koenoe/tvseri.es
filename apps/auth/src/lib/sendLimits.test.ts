import { AUTH_EDGE_KEY_HEADER as EDGE_KEY_HEADER } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { sendSourceFor, UNTRUSTED } from './sendLimits';

const KEY = 'edge-key-for-tests';

const request = (headers: Readonly<Record<string, string>>) =>
  new Request('https://auth.example.com/code/authorize', { headers });

describe('sendSourceFor: where a code request counts', () => {
  const source = sendSourceFor(KEY);

  it('takes CloudFront’s viewer address when the edge key matches', () => {
    expect(
      source(
        request({
          'cloudfront-viewer-address': '198.51.100.10:46532',
          [EDGE_KEY_HEADER]: KEY,
        }),
      ),
    ).toBe('198.51.100.10');
  });

  it('counts an IPv6 address by its /64, however it is written', () => {
    const at = (address: string) =>
      source(
        request({
          'cloudfront-viewer-address': address,
          [EDGE_KEY_HEADER]: KEY,
        }),
      );
    expect(at('2001:db8:85a3::8a2e:370:7334:443')).toBe('2001:0db8:85a3:0000');
    expect(at('2001:0DB8:85a3:0000:ffff::1:1')).toBe('2001:0db8:85a3:0000');
    expect(at('::1:443')).toBe('0000:0000:0000:0000');
  });

  it('puts every request without the right edge key in one shared bucket', () => {
    const address = { 'cloudfront-viewer-address': '198.51.100.10:46532' };
    expect(source(request(address))).toBe(UNTRUSTED);
    expect(source(request({ ...address, [EDGE_KEY_HEADER]: 'wrong' }))).toBe(
      UNTRUSTED,
    );
    expect(source(request({ ...address, [EDGE_KEY_HEADER]: `${KEY}x` }))).toBe(
      UNTRUSTED,
    );
    expect(source(request({ ...address, [EDGE_KEY_HEADER]: '' }))).toBe(
      UNTRUSTED,
    );
  });

  it('puts a request from the edge without a usable address there too', () => {
    expect(source(request({ [EDGE_KEY_HEADER]: KEY }))).toBe(UNTRUSTED);
    expect(
      source(
        request({
          'cloudfront-viewer-address': 'nope',
          [EDGE_KEY_HEADER]: KEY,
        }),
      ),
    ).toBe(UNTRUSTED);
    expect(
      source(
        request({
          'cloudfront-viewer-address': '1::2::3:443',
          [EDGE_KEY_HEADER]: KEY,
        }),
      ),
    ).toBe(UNTRUSTED);
  });

  it('trusts nothing when no key is configured', () => {
    expect(
      sendSourceFor('')(
        request({
          'cloudfront-viewer-address': '198.51.100.10:1',
          [EDGE_KEY_HEADER]: '',
        }),
      ),
    ).toBe(UNTRUSTED);
  });
});
