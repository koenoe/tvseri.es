import { isLocalHttp } from '@tvseri.es/constants';

type Settings = Readonly<{
  /** The stage's base domain (infra/dns.ts), e.g. `tvseri.es` */
  domain: string;
  /** Production never takes a local callback */
  production: boolean;
}>;

/** The clients and where each may send the user back, per stage domain */
export const clientsFor = (
  domain: string,
): Readonly<Record<string, Readonly<{ host: string; path: string }>>> => ({
  dashboard: { host: `dashboard.${domain}`, path: '/' },
  website: { host: `www.${domain}`, path: '/api/auth/callback' },
});

/**
 * OpenAuth's `allow` callback for a stage: known clients, their exact
 * redirect URIs (https on the client's own host and path, no query, hash or
 * userinfo; `http://localhost` or `127.0.0.1` only outside production), and
 * only the authorization code flow with S256 PKCE (both clients send it).
 * The patched issuer runs this before it stores the redirect URI, so a
 * rejected request gets a 400 instead of a redirect.
 */
export const createAllowClient = ({ domain, production }: Settings) => {
  const clients = clientsFor(domain);

  const isAllowedRedirect = (clientID: string, redirectURI: string) => {
    const client = Object.hasOwn(clients, clientID)
      ? clients[clientID]
      : undefined;
    if (!client || !URL.canParse(redirectURI)) {
      return false;
    }

    const url = new URL(redirectURI);
    const isOwnHost = url.protocol === 'https:' && url.host === client.host;
    // `sst dev` runs the apps locally; never in production.
    const isLocalHost = !production && isLocalHttp(url);

    return (
      (isOwnHost || isLocalHost) &&
      url.pathname === client.path &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  };

  return async (
    {
      clientID,
      redirectURI,
    }: Readonly<{ clientID: string; redirectURI: string }>,
    req: Request,
  ): Promise<boolean> => {
    const params = new URL(req.url).searchParams;

    return (
      params.get('response_type') === 'code' &&
      params.get('code_challenge_method') === 'S256' &&
      !!params.get('code_challenge') &&
      isAllowedRedirect(clientID, redirectURI)
    );
  };
};
