/**
 * The header the auth router's viewer-request function sets to the edge key
 * (infra/auth.ts), replacing any copy the browser sent. The issuer believes
 * a request's `CloudFront-Viewer-Address` only when this header carries the
 * key (apps/auth/src/lib/sendLimits.ts): then it came through CloudFront.
 */
export const AUTH_EDGE_KEY_HEADER = 'x-tvs-edge-key';
