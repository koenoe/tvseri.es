import { describe, expect, it } from 'vitest';

import { addressGroup } from './linkAttempts';

describe('addressGroup', () => {
  it('keeps an IPv4 address on its own', () => {
    expect(addressGroup('203.0.113.7')).toBe('203.0.113.7');
    expect(addressGroup('203.0.113.8')).toBe('203.0.113.8');
  });

  it('groups an IPv6 address by its /64, however it is written', () => {
    const group = '2001:db8:0:1::/64';
    expect(addressGroup('2001:db8:0:1::1')).toBe(group);
    expect(addressGroup('2001:0DB8:0000:0001:abcd:ef01:2345:6789')).toBe(group);
    expect(addressGroup('2001:db8::1:0:0:0:5')).toBe(group);
    expect(addressGroup('2001:db8:0:2::1')).toBe('2001:db8:0:2::/64');
    expect(addressGroup('::1')).toBe('0:0:0:0::/64');
  });

  it('reads an IPv4-mapped IPv6 address as IPv4', () => {
    expect(addressGroup('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(addressGroup('::FFFF:cb00:7107')).toBe('203.0.113.7');
  });

  it('leaves anything else as it came', () => {
    expect(addressGroup('unknown')).toBe('unknown');
  });
});
