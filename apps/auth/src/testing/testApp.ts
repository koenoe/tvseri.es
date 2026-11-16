import { OidcProvider } from '@openauthjs/openauth/provider/oidc';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import type { StorageAdapter } from '@openauthjs/openauth/storage/storage';

import { type AppConfig, createApp } from '../app';
import { CODE_TTL } from '../lib/codeLifetime';
import { FAKE_GOOGLE_CLIENT_ID } from './fakeGoogle';

export type SentMail = Readonly<{
  html: string;
  recipient: string;
  subject: string;
  text: string;
}>;

const LOCAL = new Set(['localhost', '127.0.0.1']);

/** Any local callback at `/api/auth/callback`, like a non-production stage */
const allowLocal: AppConfig['allow'] = async ({ redirectURI }) => {
  const url = new URL(redirectURI);
  return LOCAL.has(url.hostname) && url.pathname === '/api/auth/callback';
};

/**
 * The real app (pages, issuer, patched code provider) with stand-ins for
 * AWS: memory storage, a mailbox instead of SES, users in a map, and a
 * Google that points at `googleIssuer` (the e2e harness serves one there).
 * Shared by the unit tests and the e2e harness.
 */
export function createTestApp(
  options: Readonly<{
    /** Addresses whose send throws (SES down) */
    failFor?: (email: string) => boolean;
    googleIssuer?: string;
    /** The issuer's origin, the one the code form may be posted from */
    issuer?: string;
    /** The hourly cap on code emails (the patch's default otherwise) */
    maxCodesPerHour?: number;
    /** The issuer's refresh hook (the real one re-reads the role) */
    refresh?: AppConfig['refresh'];
    site?: string;
    /** The issuer storage (a fresh memory storage otherwise) */
    storage?: StorageAdapter;
  }> = {},
) {
  const mail: SentMail[] = [];
  const users = new Map<string, { createdAt: string; id: string }>();
  const site = options.site ?? 'https://www.example.com';
  const storage = options.storage ?? MemoryStorage();

  const app = createApp({
    allow: allowLocal,
    codeTtl: CODE_TTL,
    findOrCreateUser: async ({ email }) => {
      const key = email.trim().toLowerCase();
      let user = users.get(key);
      if (!user) {
        user = {
          createdAt: new Date().toISOString(),
          id: `user-${users.size + 1}`,
        };
        users.set(key, user);
      }
      return { id: user.id, role: 'user' };
    },
    formTargets: ['http://localhost:*', 'http://127.0.0.1:*'],
    google: OidcProvider({
      clientID: FAKE_GOOGLE_CLIENT_ID,
      issuer: options.googleIssuer ?? 'http://127.0.0.1:9/google',
      scopes: ['openid', 'email', 'profile'],
      type: 'google',
    }),
    issuer: options.issuer ?? 'http://localhost',
    maxCodesPerHour: options.maxCodesPerHour,
    refresh: options.refresh,
    sendEmail: async (message) => {
      if (options.failFor?.(message.recipient)) {
        // As SES words a refused recipient: the address is in the message
        throw Object.assign(
          new Error(
            `Email address is not verified. The following identities failed the check in region EU-WEST-2: ${message.recipient}`,
          ),
          { name: 'MessageRejected' },
        );
      }
      mail.push(message);
    },
    site,
    storage,
    ttl: { access: 600, refresh: 86_400, reuse: 300 },
  });

  /** The code in the newest email to `email` */
  const lastCode = (email: string) => {
    const last = mail.filter((m) => m.recipient === email).at(-1);
    return last?.subject.match(/: (\d{6})$/)?.[1];
  };

  return { app, lastCode, mail, storage, users };
}

/** An authorize URL for the website client with PKCE, like the site sends */
export const authorizeUrl = (
  origin: string,
  extra: Readonly<Record<string, string>> = {},
) => {
  const url = new URL('/authorize', origin);
  url.search = new URLSearchParams({
    client_id: 'website',
    code_challenge: 'Fh0NsGvxFsI8Iqsco-Cq6oalKBUdLTp_g9yH6nmXl0g',
    code_challenge_method: 'S256',
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: 'code',
    state: 'state-1',
    ...extra,
  }).toString();
  return url.toString();
};
