/** @jsxImportSource hono/jsx */
import type { AuthNotice } from '@tvseri.es/constants';

import {
  InboxIcon,
  InfoIcon,
  PROVIDER_ICONS,
  Spinner,
  WarnIcon,
} from './icons';
import { Layout } from './layout';
import { Note, type NoteCopy } from './note';

const NAMES: Readonly<Record<string, string>> = {
  apple: 'Apple',
  discord: 'Discord',
  facebook: 'Facebook',
  github: 'GitHub',
  google: 'Google',
  microsoft: 'Microsoft',
  slack: 'Slack',
  twitch: 'Twitch',
  x: 'X',
};

// Up to 3 providers each get a full-width “Continue with …”; from 4 they sit
// in a 2-column grid with short names.
const GRID_FROM = 4;

const EMAIL_INVALID =
  'That doesn’t look like an email address. Check for a typo.';

export const NOTICE_COPY: Readonly<Record<AuthNotice, NoteCopy>> = {
  google_cancelled: {
    body: 'Try again, or get a code by email.',
    icon: InfoIcon,
    title: 'Google sign-in was cancelled.',
    tone: 'info',
  },
  google_unverified: {
    body: 'Get a code by email instead.',
    icon: WarnIcon,
    title: 'Your Google account has no verified email.',
    tone: 'warn',
  },
};

export type StartPageProps = Readonly<{
  /** The address to put back after a failed post */
  email?: string;
  /** The issuer's providers, `{ key: type }`: OAuth buttons plus `code` for the email form */
  providers: Readonly<Record<string, string>>;
  /** The email didn't pass the server's check (no JS, or a crafted post) */
  emailError?: boolean;
  /** One quiet line under the title: a notice or a failed send */
  note?: NoteCopy;
  /**
   * What takes the focus: the email field (after a typo, or when Google
   * can't be used) or the first provider button (when email can't be used)
   */
  focus?: 'email' | 'provider';
  site: string;
}>;

/**
 * The start page: both ways in on one page. The provider
 * buttons come from the issuer's list (Google first and white), the email
 * form posts `action=request` straight to the code provider, whose start
 * state renders this same page with its errors.
 */
export function StartPage({
  email = '',
  emailError = false,
  focus,
  note,
  providers,
  site,
}: StartPageProps) {
  const oauth = Object.keys(providers)
    .filter((key) => providers[key] !== 'code')
    .sort((a, b) => Number(b === 'google') - Number(a === 'google'));
  const hasEmail = Object.values(providers).includes('code');
  const grid = oauth.length >= GRID_FROM;
  const buttons = oauth.map((key, index) => (
    <ProviderButton
      focus={index === 0 && focus === 'provider'}
      grid={grid}
      name={key}
      white={index === 0}
    />
  ));
  const title =
    emailError || note?.tone === 'warn' ? 'Error: Sign in' : 'Sign in';

  return (
    <Layout kind="start" site={site} title={title}>
      <main class="a-main">
        <div class="a-col">
          <h1 class="t-title-1">Sign in</h1>
          <p class="t-body-sm t-w60 t-gap-8">
            New here? Signing in creates your account.
          </p>
          {note ? <Note copy={note} /> : null}
          <div class="a-acts">
            {grid ? <div class="a-grid">{buttons}</div> : buttons}
            {hasEmail && oauth.length > 0 ? <div class="a-or">or</div> : null}
            {hasEmail ? (
              <EmailForm
                email={email}
                error={emailError}
                focus={focus === 'email' || emailError}
              />
            ) : null}
          </div>
        </div>
      </main>
    </Layout>
  );
}

function ProviderButton({
  focus,
  grid,
  name,
  white,
}: Readonly<{ focus: boolean; grid: boolean; name: string; white: boolean }>) {
  const label = NAMES[name] ?? name;
  const Icon = PROVIDER_ICONS[name];
  return (
    <a
      autofocus={focus}
      class={white ? 'a-btn w' : 'a-btn'}
      data-busy={`Opening ${label}`}
      href={`/${name}/authorize`}
    >
      <span class="v-id">
        {Icon ? <Icon /> : null}
        <span>{grid ? label : `Continue with ${label}`}</span>
      </span>
      <span class="v-bz">
        <Spinner />
        <span>{`Opening ${label}…`}</span>
      </span>
    </a>
  );
}

function EmailForm({
  email,
  error,
  focus,
}: Readonly<{ email: string; error: boolean; focus: boolean }>) {
  return (
    <form
      action="/code/authorize"
      class="a-form"
      id="ef"
      method="post"
      novalidate
    >
      <input name="action" type="hidden" value="request" />
      {/* Honeypot: people never see it; a filled one is turned away */}
      <div aria-hidden="true" class="a-hp">
        <input
          autocomplete="off"
          name="verify_email"
          tabindex={-1}
          type="email"
        />
      </div>
      <label class="a-lbl" for="em">
        Email
      </label>
      <div class={error ? 'a-in bad' : 'a-in'}>
        <input
          aria-describedby="em-m"
          aria-invalid={error ? 'true' : 'false'}
          autocapitalize="none"
          autocomplete="email"
          autofocus={focus}
          id="em"
          inputmode="email"
          name="email"
          placeholder="you@example.com"
          required
          spellcheck={false}
          type="email"
          value={email}
        />
      </div>
      <p class="a-msg" hidden={!error} id="em-m" role="alert">
        <WarnIcon />
        <span data-t={EMAIL_INVALID}>{error ? EMAIL_INVALID : ''}</span>
      </p>
      <div class="t-gap-12" />
      <button class="a-btn" type="submit">
        <span class="v-id">
          <InboxIcon />
          <span>Email me a code</span>
        </span>
        <span class="v-bz">
          <Spinner />
          <span>Sending code…</span>
        </span>
      </button>
    </form>
  );
}
