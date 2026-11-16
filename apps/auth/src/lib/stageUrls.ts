const PRODUCTION_DOMAIN = 'tvseri.es';
const DEV_DOMAIN = 'dev.tvseri.es';

/**
 * Where `sst dev` runs the website (infra/web.ts: `$dev` → `next dev` on
 * `http://localhost:3000`). No `www.<stage>.dev.tvseri.es` exists then.
 */
const LOCAL_SITE = 'http://localhost:3000';

export type StageUrls = Readonly<{
  /** The stage's base domain (infra/dns.ts) */
  domain: string;
  /** The website: the sign-in pages' logo, Not now and lost-state links */
  site: string;
}>;

/**
 * The URLs of a stage, from what the issuer knows at runtime. Deployed
 * stages serve the website on `www.<domain>` (production `www.tvseri.es`, a
 * PR preview `www.pr-<n>.dev.tvseri.es`, both from infra/web.ts). Under
 * `sst dev` (`live`: SST's local runtime sets `SST_DEV`), the website is the
 * local Next server.
 */
export function stageUrls({
  baseDomain,
  live = false,
  stage,
}: Readonly<{
  /** `BASE_DOMAIN` from infra/auth.ts */
  baseDomain?: string;
  live?: boolean;
  stage: string;
}>): StageUrls {
  // The fallback mirrors infra/dns.ts
  const domain =
    baseDomain ||
    (stage === 'production'
      ? PRODUCTION_DOMAIN
      : stage === 'dev'
        ? DEV_DOMAIN
        : `${stage}.${DEV_DOMAIN}`);
  return { domain, site: live ? LOCAL_SITE : `https://www.${domain}` };
}
