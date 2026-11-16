import { describe, expect, it } from 'vitest';

import { DATA_DOWN_DIGEST, DataDownError, isDataDown } from './dataDown';

describe('isDataDown', () => {
  it('recognises the digest, as the client gets it', () => {
    expect(isDataDown(new DataDownError())).toBe(true);
    expect(isDataDown({ digest: DATA_DOWN_DIGEST })).toBe(true);
    expect(isDataDown(Object.assign(new Error(), { digest: '123' }))).toBe(
      false,
    );
    expect(isDataDown('boom')).toBe(false);
  });
});
