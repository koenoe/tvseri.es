import { describe, expect, it } from 'vitest';

import { fitsLambdaResponse } from './lambdaResponse';

describe('fitsLambdaResponse', () => {
  it('measures the body as the Lambda response carries it (JSON-escaped)', () => {
    // 3.2 MB of quotes: 6.4 MB once every quote is escaped
    expect(fitsLambdaResponse('"'.repeat(3_200_000))).toBe(false);
    expect(fitsLambdaResponse('a'.repeat(5_000_000))).toBe(true);
    expect(fitsLambdaResponse('a'.repeat(6_000_000))).toBe(false);
  });

  it('counts bytes, not characters', () => {
    // 2 bytes each: 5.6 MB and 6 MB
    expect(fitsLambdaResponse('é'.repeat(2_800_000))).toBe(true);
    expect(fitsLambdaResponse('é'.repeat(3_000_000))).toBe(false);
  });
});
