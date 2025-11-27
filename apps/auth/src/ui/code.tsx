/** @jsxImportSource hono/jsx */
import type {
  CodeProviderError,
  CodeProviderOptions,
  CodeProviderState,
} from '@openauthjs/openauth/provider/code';
import type { CodeUICopy } from '@openauthjs/openauth/ui/code';
import { html } from 'hono/html';
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
      _error?: CodeProviderError,
    ): Promise<Response> => {
      if (state.type === 'start') {
        const jsx = (
          <Layout>
            {html`
              <script>
                function disableSubmitButton(event) {
                  const form = event.target;
                  const button = form.querySelector('[data-component="button"]');
                  if (button) {
                    button.setAttribute('data-loading', 'true');
                    if (button instanceof HTMLButtonElement) {
                      button.disabled = true;
                    }
                  }
                }
              </script>
            `}
            <form
              data-component="form"
              method="post"
              onsubmit="disableSubmitButton(event)"
            >
              <input name="action" type="hidden" value="request" />
              <input
                autofocus
                data-1p-ignore
                data-component="input"
                id="email"
                inputMode="email"
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
            {html`
              <script>
                function getCodeInputs() {
                  return Array.from(document.querySelectorAll('[data-element="code"]')).filter(
                    (el) => el instanceof HTMLInputElement,
                  );
                }

                function getHiddenCodeInput() {
                  return document.querySelector('input[name="code"]');
                }

                function getCodeFormElement() {
                  return document.querySelector('form[data-form="code"]');
                }

                function disableCodeInputs() {
                  getCodeInputs().forEach((input) => {
                    input.disabled = true;
                  });
                }

                function updateCodeValue() {
                  const values = getCodeInputs().map((input) => input.value);
                  const hiddenInput = getHiddenCodeInput();
                  if (hiddenInput instanceof HTMLInputElement) {
                    hiddenInput.value = values.join('');
                  }

                  if (values.every((v) => v.length === 1) && values.length === 6) {
                    disableCodeInputs();
                    const codeForm = getCodeFormElement();
                    if (codeForm instanceof HTMLFormElement) {
                      if (typeof codeForm.requestSubmit === 'function') {
                        codeForm.requestSubmit();
                      } else {
                        codeForm.submit();
                      }
                    }
                  }
                }

                function focusNextInput(current) {
                  if (!(current instanceof HTMLInputElement)) {
                    return;
                  }
                  const all = getCodeInputs();
                  const idx = all.indexOf(current);
                  if (idx > -1) {
                    all[idx + 1]?.focus();
                  }
                }

                function focusPreviousInput(current) {
                  if (!(current instanceof HTMLInputElement)) {
                    return;
                  }
                  const all = getCodeInputs();
                  const idx = all.indexOf(current);
                  if (idx > -1) {
                    all[idx - 1]?.focus();
                  }
                }

                function handleCodePaste(event) {
                  event.preventDefault();
                  const paste = (event.clipboardData || window.clipboardData).getData('text');
                  const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
                  const all = getCodeInputs();

                  digits.forEach((digit, i) => {
                    if (all[i]) {
                      all[i].value = digit;
                    }
                  });

                  const focusIdx = Math.min(digits.length, all.length - 1);
                  all[focusIdx]?.focus();
                  updateCodeValue();
                }

                function handleCodeInput(event) {
                  const target = event.target;
                  if (!(target instanceof HTMLInputElement)) {
                    return;
                  }
                  const value = target.value.replace(/\D/g, '');
                  target.value = value.slice(-1);

                  if (value.length > 0) {
                    focusNextInput(target);
                  }
                  updateCodeValue();
                }

                function handleCodeKeyDown(event) {
                  const target = event.target;
                  if (!(target instanceof HTMLInputElement)) {
                    return;
                  }
                  if (event.key === 'Backspace') {
                    if (target.value === '') {
                      focusPreviousInput(target);
                    } else {
                      target.value = '';
                    }
                    updateCodeValue();
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    focusPreviousInput(target);
                  } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    focusNextInput(target);
                  }
                }

                function handleCodeFocus(event) {
                  const target = event.target;
                  if (target instanceof HTMLInputElement) {
                    target.select();
                  }
                }

                function handleCodeFormSubmit() {
                  disableCodeInputs();
                }
              </script>
            `}
            <form
              data-component="form"
              data-form="code"
              method="post"
              onsubmit="handleCodeFormSubmit()"
            >
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
                    onfocus="handleCodeFocus(event)"
                    oninput="handleCodeInput(event)"
                    onkeydown="handleCodeKeyDown(event)"
                    onpaste="handleCodePaste(event)"
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
