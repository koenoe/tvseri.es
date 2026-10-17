import { Resource } from 'sst';

const IS_PRODUCTION = Resource.App.stage === 'production';

// Every stage serves its apps under its own domain. BASE_DOMAIN comes from
// infra/dns.ts (via infra/auth.ts); the fallback mirrors that logic.
const DOMAIN =
  process.env.BASE_DOMAIN ||
  (IS_PRODUCTION
    ? 'tvseri.es'
    : Resource.App.stage === 'dev'
      ? 'dev.tvseri.es'
      : `${Resource.App.stage}.dev.tvseri.es`);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const CLIENTS: Readonly<
  Record<string, Readonly<{ host: string; path: string }>>
> = {
  dashboard: { host: `dashboard.${DOMAIN}`, path: '/' },
  website: { host: `www.${DOMAIN}`, path: '/api/auth/callback' },
};

const isAllowedRedirect = (clientID: string, redirectURI: string): boolean => {
  const client = Object.hasOwn(CLIENTS, clientID)
    ? CLIENTS[clientID]
    : undefined;
  if (!client || !URL.canParse(redirectURI)) {
    return false;
  }

  const url = new URL(redirectURI);
  const isOwnHost = url.protocol === 'https:' && url.host === client.host;
  // `sst dev` runs the apps locally; never in production.
  const isLocalHost =
    !IS_PRODUCTION && url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);

  return (
    (isOwnHost || isLocalHost) &&
    url.pathname === client.path &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password
  );
};

/**
 * OpenAuth `allow` callback: known clients, their exact redirect URIs, and only
 * the authorization code flow with S256 PKCE (both clients send it). The
 * patched issuer runs this before it stores the redirect URI, so a rejected
 * request gets a 400 instead of a redirect.
 */
export const allowClient = async (
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
