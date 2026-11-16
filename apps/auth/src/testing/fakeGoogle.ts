import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto';

/** The client id the test apps give their stand-in Google */
export const FAKE_GOOGLE_CLIENT_ID = 'test-google-client';

/**
 * A signing key of a stand-in Google: its public JWK (for the JWKS) and
 * id_tokens signed with it, issued by `issuer` for the test client.
 * Shared by the unit tests and the e2e harness.
 */
export function fakeGoogleKey(issuer: string, kid = 'k1') {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    alg: 'RS256',
    kid,
    use: 'sig',
  };
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const idToken = (claims: Readonly<Record<string, unknown>>) => {
    const now = Math.floor(Date.now() / 1000);
    const body = `${b64({ alg: 'RS256', kid, typ: 'JWT' })}.${b64({
      aud: FAKE_GOOGLE_CLIENT_ID,
      exp: now + 600,
      iat: now,
      iss: issuer,
      sub: randomUUID(),
      ...claims,
    })}`;
    const signature = createSign('RSA-SHA256')
      .update(body)
      .sign(privateKey, 'base64url');
    return `${body}.${signature}`;
  };
  return { idToken, jwk };
}
