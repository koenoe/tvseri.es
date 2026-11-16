/** @jsxImportSource hono/jsx */

import { formatCodeLifetime } from '../lib/codeLifetime';
import {
  CheckIcon,
  ClockIcon,
  ExternalIcon,
  RefreshIcon,
  Spinner,
  WarnIcon,
} from './icons';
import { Layout } from './layout';
import { Note, type NoteCopy } from './note';

const LENGTH = 6;
const SLOTS = Array.from({ length: LENGTH }, (_, index) => index);

// “Open Gmail” for the big webmail domains; a custom domain gets nothing
// (by domain, desktop pointers only).
const INBOXES: Readonly<Record<string, readonly [string, string]>> = {
  'gmail.com': ['Gmail', 'https://mail.google.com/'],
  'googlemail.com': ['Gmail', 'https://mail.google.com/'],
  'hotmail.com': ['Outlook', 'https://outlook.live.com/mail/'],
  'icloud.com': ['iCloud Mail', 'https://www.icloud.com/mail/'],
  'live.com': ['Outlook', 'https://outlook.live.com/mail/'],
  'mac.com': ['iCloud Mail', 'https://www.icloud.com/mail/'],
  'me.com': ['iCloud Mail', 'https://www.icloud.com/mail/'],
  'msn.com': ['Outlook', 'https://outlook.live.com/mail/'],
  'outlook.com': ['Outlook', 'https://outlook.live.com/mail/'],
};

const inboxFor = (email: string) =>
  INBOXES[
    email
      .slice(email.lastIndexOf('@') + 1)
      .trim()
      .toLowerCase()
  ];

export type CodeState = 'expired' | 'typing' | 'wrong';

type Props = Readonly<{
  /** The claims the code went to, posted again by “resend” */
  claims: Readonly<Record<string, string>>;
  /** The digits to put back after a wrong code */
  code?: string;
  /** How long a sent code works, in seconds (`CODE_TTL`) */
  codeTtl: number;
  /** This render follows a send: the resend cooldown starts now */
  fresh: boolean;
  /** A note under the address (resent, rate limited, send failed) */
  note?: NoteCopy;
  site: string;
  state: CodeState;
}>;

/**
 * The code page: the address the code went to, one real input
 * drawn as six slots on a season line, Sign in, and resend with a cooldown.
 * Without JS it is one wide field and a button; every action is a post.
 */
export function CodePage({
  claims,
  code = '',
  codeTtl,
  fresh,
  note,
  site,
  state,
}: Props) {
  const email = claims.email ?? '';
  const lifetime = formatCodeLifetime(codeTtl);
  const title =
    state === 'typing' && note?.tone !== 'warn'
      ? 'Check your email'
      : 'Error: Check your email';

  return (
    <Layout kind="code" site={site} state={state} title={title}>
      <main class="a-main">
        <div class="a-col">
          <h1 class="t-title-1">Check your email</h1>
          <p class="t-body-sm t-gap-8">
            Enter the code we sent to <b class="t-white t-600">{email}</b>.{' '}
            <button class="a-link" form="ch" type="submit">
              Change
            </button>
          </p>
          {note ? <Note copy={note} /> : null}
          {state === 'expired' ? (
            <Expired lifetime={lifetime} />
          ) : (
            <CodeForm code={code} lifetime={lifetime} state={state} />
          )}
          {/* Change: the start page with this address put back (app.ts) */}
          <form action="/code/authorize" id="ch" method="post">
            <input name="email" type="hidden" value={email} />
            <input name="action" type="hidden" value="change" />
          </form>
          <form action="/code/authorize" id="rs" method="post">
            {Object.entries(claims).map(([name, value]) => (
              <input name={name} type="hidden" value={value} />
            ))}
            <input name="action" type="hidden" value="resend" />
          </form>
          {state === 'expired' ? null : <Resend email={email} fresh={fresh} />}
        </div>
      </main>
    </Layout>
  );
}

function Slots({ code }: Readonly<{ code: string }>) {
  return (
    <>
      {SLOTS.map((index) => {
        const digit = code.charAt(index);
        return (
          <div class={digit ? 'a-sl f' : 'a-sl'}>
            <b>{digit}</b>
            <i />
          </div>
        );
      })}
    </>
  );
}

function CodeForm({
  code,
  lifetime,
  state,
}: Readonly<{ code: string; lifetime: string; state: CodeState }>) {
  const wrong = state === 'wrong';
  return (
    <form action="/code/authorize" id="cf" method="post" novalidate>
      <input name="action" type="hidden" value="verify" />
      <label class="a-lbl t-gap-32" for="code">
        6-digit code
      </label>
      <div class={wrong ? 'a-otp bad shake' : 'a-otp'}>
        {/* The field spans all six slots, so password managers drew their
            icon over the 6th: an emailed code is never theirs to fill */}
        <input
          aria-describedby="code-h code-e"
          aria-invalid={wrong ? 'true' : 'false'}
          autocomplete="one-time-code"
          autofocus
          data-1p-ignore
          data-bwignore
          data-lpignore="true"
          id="code"
          inputmode="numeric"
          name="code"
          pattern="[0-9]*"
          required
          type="text"
          value={code}
        />
        <Slots code={code} />
      </div>
      {wrong ? (
        <p class="a-msg" id="code-e" role="alert">
          <WarnIcon />
          <span>
            That code isn’t right. Check the newest email from tvseri.es.
          </span>
        </p>
      ) : null}
      <p class="t-caption t-gap-8" id="code-h">
        {`Codes work for ${lifetime}. Only the newest one works.`}
      </p>
      <div class="t-gap-24" />
      <button class="a-btn w dim" type="submit">
        <span class="v-id">Sign in</span>
        <span class="v-bz">
          <Spinner />
          <span>Signing in…</span>
        </span>
        <span class="v-ok">
          <CheckIcon />
          <span>Signed in · taking you back</span>
        </span>
      </button>
    </form>
  );
}

// Expired, used, or 5 wrong tries: one explanation for all three, and the
// main button sends a new code (the resend post with the claims).
function Expired({ lifetime }: Readonly<{ lifetime: string }>) {
  return (
    <div>
      <label class="a-lbl t-gap-32" for="code">
        6-digit code
      </label>
      <div class="a-otp dim">
        <input
          autocomplete="off"
          disabled
          id="code"
          inputmode="numeric"
          type="text"
        />
        <Slots code="" />
      </div>
      <p class="a-msg" role="alert">
        <ClockIcon />
        <span>
          {`This code has expired. Codes work for ${lifetime} and allow 5 tries.`}
        </span>
      </p>
      <div class="t-gap-24" />
      <button autofocus class="a-btn w" form="rs" type="submit">
        <RefreshIcon />
        <span>Send a new code</span>
      </button>
    </div>
  );
}

function Resend({ email, fresh }: Readonly<{ email: string; fresh: boolean }>) {
  const inbox = inboxFor(email);
  return (
    <>
      <p class="a-res" data-fresh={fresh ? '' : undefined} id="res">
        Didn’t get it? Check spam, or{' '}
        <button class="a-link" form="rs" id="rsb" type="submit">
          resend the code
        </button>
        <span hidden id="res-in">
          {' in '}
          <span class="tn">0:30</span>
        </span>
      </p>
      {inbox ? (
        <div class="a-pills">
          <a
            class="a-pill"
            href={inbox[1]}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalIcon />
            <span>{`Open ${inbox[0]}`}</span>
          </a>
        </div>
      ) : null}
    </>
  );
}
