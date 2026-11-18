import { isLocalHost, isLocalHttp } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

describe('local hosts', () => {
  it('knows localhost and 127.0.0.1 only', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
    expect(isLocalHost('localhost.example.com')).toBe(false);
    expect(isLocalHost('0.0.0.0')).toBe(false);
  });

  it('takes plain http on a local host, nothing else', () => {
    expect(isLocalHttp(new URL('http://localhost:3000/x'))).toBe(true);
    expect(isLocalHttp(new URL('https://localhost:3000/x'))).toBe(false);
    expect(isLocalHttp(new URL('http://tvseri.es/x'))).toBe(false);
  });
});
