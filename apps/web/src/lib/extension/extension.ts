import {
  type ConnectionLinkReply,
  ConnectionLinkReplySchema,
  type ConnectionService,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

/**
 * Talking to the extension from the page (its `externally_connectable` lets
 * in only www.tvseri.es, or localhost:3000 for the dev copy). `link` doesn't
 * link: the extension opens its popup with the code filled in, the viewer
 * confirms there, and the card's poll sees the link land.
 */

/**
 * The ids the site asks, in turn: the hand-loaded build's (its manifest's
 * key fixes it), then the Chrome Web Store's, which gives a listed
 * extension its own
 */
export const EXTENSION_IDS: ReadonlyArray<string> = [
  'midgpplaihphccejepaigffjjlbcjkmc',
  'gnejijlljabmdidklojkipaflnpameok',
];

/**
 * The Chrome Web Store listing, or null while there is none (install by hand
 * from /extension). Setting it switches every Add to Chrome over.
 */
const EXTENSION_STORE_URL: string | null = null;

/** Where Add to Chrome goes: the listing in a new tab, else /extension's manual install */
export type ExtensionInstall = Readonly<{ external: boolean; href: string }>;

export const extensionInstall = (
  storeUrl: string | null = EXTENSION_STORE_URL,
): ExtensionInstall =>
  storeUrl === null
    ? { external: false, href: '/extension' }
    : { external: true, href: storeUrl };

/** `outdated`: installed, but from before the service was added */
export type ExtensionCheck =
  | 'checking'
  | 'unsupported'
  | 'missing'
  | 'outdated'
  | 'present';

type SendMessage = (
  extensionId: string,
  message: unknown,
  reply: (answer: unknown) => void,
) => void;

/** Typed by hand, as far as the page uses it: no dependency */
export type ChromeRuntime = Readonly<{
  lastError?: unknown;
  sendMessage: SendMessage;
}>;

/** Only Chromium has one, and only with an extension that lets the page in */
export const readRuntime = (): ChromeRuntime | null => {
  const chrome = (
    globalThis as { chrome?: { runtime?: Partial<ChromeRuntime> } }
  ).chrome;
  const runtime = chrome?.runtime;
  return typeof runtime?.sendMessage === 'function'
    ? (runtime as ChromeRuntime)
    : null;
};

/** A ping is instant when installed; past this, it isn't */
const PING_TIMEOUT_MS = 1500;
/** A build from before the consent screen calls tvseri.es before it answers */
const LINK_TIMEOUT_MS = 20_000;

/**
 * `undefined` for no answer: Chrome sets `lastError`, or throws for an id it
 * can't reach.
 */
function ask(
  runtime: ChromeRuntime,
  extensionId: string,
  message: unknown,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs);
    const settle = (answer: unknown) => {
      clearTimeout(timer);
      resolve(answer);
    };
    try {
      runtime.sendMessage(extensionId, message, (answer) => {
        // Reading lastError also keeps Chrome from logging it as unchecked
        settle(runtime.lastError ? undefined : answer);
      });
    } catch {
      settle(undefined);
    }
  });
}

const PingReplySchema = v.object({
  installed: v.literal(true),
  services: v.array(v.string()),
  version: v.string(),
});

export type ExtensionFound = Readonly<{
  id: string;
  services: ReadonlyArray<string>;
  version: string;
}>;

/** The installed extension (the first id that answers), or null. */
export async function pingExtension(
  runtime: ChromeRuntime | null,
): Promise<ExtensionFound | null> {
  if (!runtime) {
    return null;
  }
  for (const id of EXTENSION_IDS) {
    const parsed = v.safeParse(
      PingReplySchema,
      await ask(runtime, id, { type: 'ping' }, PING_TIMEOUT_MS),
    );
    if (parsed.success) {
      const { services, version } = parsed.output;
      return { id, services, version };
    }
  }
  return null;
}

/**
 * `pending-consent`, or the link's own reply from a build before the consent
 * screen. Not part of the API's contract, so kept here.
 */
const ExtensionLinkReplySchema = v.union([
  v.object({ ok: v.literal(false), reason: v.literal('pending-consent') }),
  ConnectionLinkReplySchema,
]);
type ExtensionLinkReply = v.InferOutput<typeof ExtensionLinkReplySchema>;

/** Null on no answer, which isn't a failure: the card's poll sees the link land */
export async function sendLinkCode(
  runtime: ChromeRuntime,
  extensionId: string,
  code: string,
  service: ConnectionService,
): Promise<ExtensionLinkReply | null> {
  const parsed = v.safeParse(
    ExtensionLinkReplySchema,
    await ask(
      runtime,
      extensionId,
      { code, service, type: 'link' },
      LINK_TIMEOUT_MS,
    ),
  );
  return parsed.success ? parsed.output : null;
}

/** The site's Cancel, passed on: the extension drops the request it holds */
export async function cancelLinkCode(
  runtime: ChromeRuntime,
  extensionId: string,
  code: string,
): Promise<void> {
  await ask(runtime, extensionId, { code, type: 'cancel' }, PING_TIMEOUT_MS);
}

const RequestStateSchema = v.object({
  state: v.picklist(['declined', 'gone', 'waiting']),
});

/**
 * `gone`: linked, expired or replaced. Null when an older build doesn't know
 * the question.
 */
export async function readRequestState(
  runtime: ChromeRuntime,
  extensionId: string,
  code: string,
): Promise<'declined' | 'gone' | 'waiting' | null> {
  const parsed = v.safeParse(
    RequestStateSchema,
    await ask(
      runtime,
      extensionId,
      { code, type: 'request-state' },
      PING_TIMEOUT_MS,
    ),
  );
  return parsed.success ? parsed.output.state : null;
}

type LinkFailure = Extract<ConnectionLinkReply, { ok: false }>['reason'];

/** Kept word for word with `apps/extension/popup.js` (a test checks) */
export const linkFailureText = ({
  name,
  site,
}: Readonly<{ name: string; site: string }>): Readonly<
  Record<LinkFailure, string>
> => ({
  'bad-code':
    'That code isn’t valid, or it expired. Get a new one on tvseri.es.',
  'rate-limited': 'Too many tries. Wait a minute, then get a new code.',
  'signed-out': `This browser isn’t signed in to ${name}. Sign in on ${site}, then try again.`,
  'test-read-failed': `${name} didn’t answer the check. Get a new code on tvseri.es and try again in a moment.`,
  unavailable: 'tvseri.es couldn’t be reached. Try again shortly.',
});
