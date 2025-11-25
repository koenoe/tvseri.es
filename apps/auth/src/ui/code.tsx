/** @jsxImportSource hono/jsx */
import type {
  CodeProviderError,
  CodeProviderOptions,
  CodeProviderState,
} from '@openauthjs/openauth/provider/code';
import type { CodeUICopy } from '@openauthjs/openauth/ui/code';
import { Layout } from './layout';
import { LoadingDots } from './loading-dots';

/**
 * Default copy for the Code UI.
 * Matches the defaults from @openauthjs/openauth/ui/code
 */
const DEFAULT_COPY: CodeUICopy = {
  button_continue: 'Continue',
  code_didnt_get: "Didn't get code?",
  code_info: "We'll send a pin code to your email.",
  code_invalid: 'Invalid code',
  code_placeholder: 'Code',
  code_resend: 'Resend',
  code_resent: 'Code resent to ',
  code_sent: 'Code sent to ',
  email_invalid: 'Email address is not valid',
  email_placeholder: 'Email',
};

export interface CodeUIOptions {
  sendCode: (claims: Record<string, string>, code: string) => Promise<void>;
  copy?: Partial<CodeUICopy>;
}

/**
 * Polyfill for esbuild's __name helper which is injected during compilation
 * but not available in the browser when using .toString() on functions.
 */
const __namePolyfill = `var __defProp=Object.defineProperty;var __name=function(t,n){return __defProp(t,"name",{value:n,configurable:true})};`;

/**
 * Inline script for form submit loading state.
 * Only applies to forms without data-form attribute (i.e., email form, not OTP form).
 */
function formScript() {
  document.querySelectorAll('form:not([data-form])').forEach((form) => {
    form.addEventListener('submit', () => {
      const button = form.querySelector('[data-component="button"]');
      if (button) {
        button.setAttribute('data-loading', 'true');
        (button as HTMLButtonElement).disabled = true;
      }
    });
  });
}

/**
 * Inline script for OTP input handling.
 * Uses vanilla JS/DOM for a stateless approach (similar to SST Console).
 */
function otpScript() {
  const inputs = () =>
    document.querySelectorAll<HTMLInputElement>('[data-element="code"]');
  const hidden = () =>
    document.querySelector<HTMLInputElement>('input[name="code"]');
  const form = () =>
    document.querySelector<HTMLFormElement>('form[data-form="code"]');

  function setDisabled(disabled: boolean) {
    inputs().forEach((input) => {
      input.disabled = disabled;
    });
  }

  function setValue() {
    const values = Array.from(inputs()).map((el) => el.value);
    const hiddenInput = hidden();
    if (hiddenInput) {
      hiddenInput.value = values.join('');
    }

    // Auto-submit when all 6 digits are entered
    if (values.every((v) => v.length === 1) && values.length === 6) {
      setDisabled(true);
      form()?.submit();
    }
  }

  function focusNext(current: HTMLInputElement) {
    const all = Array.from(inputs());
    const idx = all.indexOf(current);
    all[idx + 1]?.focus();
  }

  function focusPrev(current: HTMLInputElement) {
    const all = Array.from(inputs());
    const idx = all.indexOf(current);
    all[idx - 1]?.focus();
  }

  inputs().forEach((input) => {
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (
        e.clipboardData ||
        (window as unknown as { clipboardData: DataTransfer }).clipboardData
      ).getData('text');
      const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
      const all = Array.from(inputs());

      digits.forEach((digit: string, i: number) => {
        if (all[i]) {
          all[i].value = digit;
        }
      });

      // Focus last filled or last input
      const focusIdx = Math.min(digits.length, all.length - 1);
      all[focusIdx]?.focus();
      setValue();
    });

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = target.value.replace(/\D/g, '');
      target.value = value.slice(-1); // Only keep last digit

      if (value.length > 0) {
        focusNext(target);
      }
      setValue();
    });

    input.addEventListener('keydown', (e) => {
      const target = e.target as HTMLInputElement;
      if (e.key === 'Backspace') {
        if (target.value === '') {
          focusPrev(target);
        } else {
          target.value = '';
        }
        setValue();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusPrev(target);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusNext(target);
      }
    });

    input.addEventListener('focus', (e) => {
      (e.target as HTMLInputElement).select();
    });
  });
}

export function CodeUI(options: CodeUIOptions): CodeProviderOptions {
  const copy: CodeUICopy = {
    ...DEFAULT_COPY,
    ...options.copy,
  };

  return {
    request: async (
      _req: Request,
      state: CodeProviderState,
      _form?: FormData,
      error?: CodeProviderError,
    ): Promise<Response> => {
      if (state.type === 'start') {
        const jsx = (
          <Layout>
            <form data-component="form" method="post">
              <input name="action" type="hidden" value="request" />
              <input
                autofocus
                data-1p-ignore
                data-component="input"
                id="email"
                name="email"
                placeholder={copy.email_placeholder}
                required
                type="email"
              />
              <button data-component="button" type="submit">
                <span data-slot="text">{copy.button_continue}</span>
                <LoadingDots />
              </button>
            </form>
            <script
              dangerouslySetInnerHTML={{
                __html: `${__namePolyfill}(${formScript.toString()})();`,
              }}
            />
          </Layout>
        );

        return new Response(jsx.toString(), {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      }

      if (state.type === 'code') {
        const jsx = (
          <Layout>
            <form data-component="form" data-form="code" method="post">
              <input name="action" type="hidden" value="verify" />
              <input name="code" type="hidden" value="" />
              <div data-component="code-inputs">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    aria-label={`Digit ${i + 1} of verification code`}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    autofocus={i === 0}
                    data-1p-ignore
                    data-component="code-input"
                    data-element="code"
                    inputMode="numeric"
                    key={i}
                    maxLength={1}
                    pattern="[0-9]*"
                    required
                    type="text"
                  />
                ))}
              </div>
            </form>
            <form method="post">
              {Object.entries(state.claims).map(([key, value]) => (
                <input key={key} name={key} type="hidden" value={value} />
              ))}
              <input name="action" type="hidden" value="resend" />
              <div data-component="form-footer">
                <span>{copy.code_didnt_get}</span>
                <button data-component="link" type="submit">
                  {copy.code_resend}
                </button>
              </div>
            </form>
            <script
              dangerouslySetInnerHTML={{
                __html: `${__namePolyfill}(${otpScript.toString()})();`,
              }}
            />
          </Layout>
        );

        return new Response(jsx.toString(), {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      }

      // Unknown state - redirect to start
      return new Response(null, {
        headers: {
          Location: '/code/authorize',
        },
        status: 302,
      });
    },
    sendCode: options.sendCode,
  };
}
