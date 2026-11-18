/**
 * A local server without the session secret (tests, the style guide, an
 * agent's `next dev`) can't read sessions. localhost cookies are shared across
 * ports, so it must not touch the ones `sst dev` set either: it behaves as
 * signed out. Production always has the secret and never takes this path.
 */
export default function isLocalWithoutSecret(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.SECRET_KEY;
}
