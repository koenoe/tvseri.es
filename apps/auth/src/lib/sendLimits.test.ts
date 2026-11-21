import { AUTH_EDGE_KEY_HEADER as EDGE_KEY_HEADER } from '@tvseri.es/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CONNECTION_IP_HEADER,
  edgeKeyCheck,
  sendSourceFor,
} from './sendLimits';

const KEY = 'edge-key-for-tests';

const request = (headers: Readonly<Record<string, string>>) =>
  new Request('https://auth.example.com/code/authorize', { headers });

const VIEWER = { 'cloudfront-viewer-address': '198.51.100.10:46532' };
// The Lambda's own view: who opened the connection (CloudFront, or a
// direct caller of the function URL)
const CONNECTION = { [CONNECTION_IP_HEADER]: '203.0.113.9' };

describe('sendSourceFor: where a code request counts', () => {
  const source = sendSourceFor(KEY);

  it('takes CloudFront’s viewer address when the edge key matches', () => {
    expect(
      source(request({ ...VIEWER, ...CONNECTION, [EDGE_KEY_HEADER]: KEY })),
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

  it('without the right edge key, counts by the connection, never the stated address', () => {
    for (const key of [undefined, 'wrong', `${KEY}x`, '']) {
      const headers = {
        ...VIEWER,
        ...CONNECTION,
        ...(key === undefined ? {} : { [EDGE_KEY_HEADER]: key }),
      };
      expect(source(request(headers)), String(key)).toBe(
        'connection:203.0.113.9',
      );
    }
  });

  it('counts IPv6 connections by their /64 too', () => {
    expect(
      source(request({ [CONNECTION_IP_HEADER]: '2001:db8:1:2:3:4:5:6' })),
    ).toBe('connection:2001:0db8:0001:0002');
  });

  it('with the key but no usable viewer address, counts by the connection', () => {
    for (const address of [undefined, 'nope', '1::2::3:443']) {
      const headers = {
        ...CONNECTION,
        [EDGE_KEY_HEADER]: KEY,
        ...(address ? { 'cloudfront-viewer-address': address } : {}),
      };
      expect(source(request(headers)), String(address)).toBe(
        'connection:203.0.113.9',
      );
    }
  });

  it('has no source (no per-network cap) when the connection is unknown', () => {
    expect(source(request(VIEWER))).toBeUndefined();
    expect(sendSourceFor('')(request(VIEWER))).toBeUndefined();
  });

  it('trusts no stated address when no key is configured', () => {
    expect(
      sendSourceFor('')(
        request({ ...VIEWER, ...CONNECTION, [EDGE_KEY_HEADER]: '' }),
      ),
    ).toBe('connection:203.0.113.9');
  });
});

describe('edgeKeyCheck: is the edge key arriving?', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns once when CloudFront’s headers come without the right key, never with the key or the address', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const check = edgeKeyCheck(KEY);

    check(request({ [EDGE_KEY_HEADER]: KEY, ...VIEWER }));
    check(request({})); // local, or a direct call: nothing to say
    expect(warn).not.toHaveBeenCalled();

    check(request({ ...VIEWER, [EDGE_KEY_HEADER]: 'wrong-key-value' }));
    check(request(VIEWER));
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).toContain('AUTH EDGE KEY MISSING');
    expect(logged).not.toContain('wrong-key-value');
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain('198.51.100.10');
  });
});
