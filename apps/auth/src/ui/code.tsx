/** @jsxImportSource hono/jsx */
import type {
  CodeProviderError,
  CodeProviderOptions,
  CodeProviderState,
} from '@openauthjs/openauth/provider/code';

import { CodePage } from './codePage';
import { CheckIcon, WarnIcon } from './icons';
import type { NoteCopy } from './note';
import { htmlPage } from './page';
import { StartPage } from './start';

// Server-side sanity check only; the real proof is receiving the code.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESENT: NoteCopy = {
  body: 'Only the newest one works.',
  icon: CheckIcon,
  title: 'New code sent.',
  tone: 'ok',
};

const warn = (title: string, body: string): NoteCopy => ({
  body,
  icon: WarnIcon,
  title,
  tone: 'warn',
});

export type CodeUIOptions = Readonly<{
  /** How long a sent code works, in seconds: the page says it */
  codeTtl: number;
  /** The issuer's providers, so the start state draws the same start page */
  providers: Readonly<Record<string, string>>;
  sendCode: (claims: Record<string, string>, code: string) => Promise<void>;
  site: string;
}>;

const formValue = (form: FormData | undefined, name: string) => {
  const value = form?.get(name);
  return typeof value === 'string' ? value : '';
};

/**
 * A claim the provider must not act on: the honeypot (bots fill hidden
 * fields; `request` redirects these back to the start) or not an address.
 * Only trimmed here: the provider's storage key and the user lookup
 * normalise the address themselves.
 */
const checkClaims = (
  claims: Record<string, string>,
): CodeProviderError | undefined => {
  if (claims.verify_email) {
    return { key: 'verify_email', type: 'invalid_claim', value: '' };
  }
  const email = (claims.email ?? '').trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { key: 'email', type: 'invalid_claim', value: email };
  }
  return undefined;
};

/**
 * The email code provider's UI. Its start state is the start
 * page itself (the form there posts `action=request` here), so a failed send
 * shows on the page the person was on, with what they typed put back. The
 * code state is the code page.
 */
export function CodeUI(options: CodeUIOptions): CodeProviderOptions {
  const hasGoogle = Object.hasOwn(options.providers, 'google');
  // Email refused (a failed send or the hourly cap, then this address's
  // 5 codes in 15 minutes): say so plainly and lead with Google, which
  // works now. The Google button, already first, takes the focus.
  const startNotes: Partial<Record<CodeProviderError['type'], NoteCopy>> = {
    rate_limited: warn(
      'Email codes for this address are paused for 15 minutes.',
      hasGoogle ? 'Continue with Google to sign in now.' : 'Ask again then.',
    ),
    send_failed: warn(
      'Email codes are unavailable right now.',
      hasGoogle
        ? 'Continue with Google to sign in now, or try email again later.'
        : 'Try again in a few minutes.',
    ),
  };
  // A failed resend keeps the person on the code page (our patch)
  const codeNotes: Partial<Record<CodeProviderError['type'], NoteCopy>> = {
    rate_limited: warn(
      'That’s 5 codes in 15 minutes.',
      'Use the newest one, or ask again in a few minutes.',
    ),
    send_failed: warn(
      'We couldn’t send a new code.',
      'Use the newest one, or try again in a minute.',
    ),
  };

  return {
    // Before anything is counted (the hourly cap, our patch) or sent
    checkClaims: async (claims) => checkClaims(claims),
    request: async (
      _req: Request,
      state: CodeProviderState,
      form?: FormData,
      error?: CodeProviderError,
    ): Promise<Response> => {
      // Honeypot: bots fill hidden fields, people don't see them
      if (formValue(form, 'verify_email')) {
        return new Response(null, {
          headers: { Location: '/code/authorize' },
          status: 302,
        });
      }

      if (state.type === 'start') {
        const emailError = error?.type === 'invalid_claim';
        const emailRefused =
          error?.type === 'send_failed' || error?.type === 'rate_limited';
        return htmlPage(
          <StartPage
            email={formValue(form, 'email')}
            emailError={emailError}
            focus={emailRefused && hasGoogle ? 'provider' : undefined}
            note={error ? startNotes[error.type] : undefined}
            providers={options.providers}
            site={options.site}
          />,
        );
      }

      if (state.type === 'code') {
        const action = formValue(form, 'action');
        const fresh = !error && (action === 'request' || action === 'resend');
        const note =
          (error ? codeNotes[error.type] : undefined) ??
          (fresh && state.resend ? RESENT : undefined);
        const codeState =
          error?.type === 'code_expired'
            ? 'expired'
            : error?.type === 'invalid_code'
              ? 'wrong'
              : 'typing';
        const code =
          codeState === 'wrong'
            ? formValue(form, 'code').replace(/\D/g, '').slice(0, 6)
            : '';
        return htmlPage(
          <CodePage
            claims={state.claims}
            code={code}
            codeTtl={options.codeTtl}
            fresh={fresh}
            note={note}
            site={options.site}
            state={codeState}
          />,
        );
      }

      // Unknown state: back to the start
      return new Response(null, {
        headers: { Location: '/code/authorize' },
        status: 302,
      });
    },
    // Returning an error means nothing was sent: the provider then records
    // nothing, so the honeypot and failures don't use up anyone's limit.
    sendCode: async (claims, code) => {
      const invalid = checkClaims(claims);
      if (invalid) {
        return invalid;
      }
      const email = (claims.email ?? '').trim();

      try {
        await options.sendCode({ ...claims, email }, code);
      } catch (error) {
        // Don't surface raw SES errors. Only the error's name is logged: SES
        // puts a refused address in its message
        console.error(
          'Failed to send code',
          error instanceof Error ? error.name : 'UnknownError',
        );
        return { type: 'send_failed' };
      }
    },
  };
}
