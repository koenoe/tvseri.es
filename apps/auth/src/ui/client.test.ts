import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import { authorizeUrl, createTestApp } from '../testing/testApp';
import { CLIENT_SCRIPT } from './client';

const ORIGIN = 'http://localhost';

/** Real pages from the real app: the start page and a fresh code page */
async function renderPages() {
  const { app } = createTestApp();
  const start = await app.request(authorizeUrl(ORIGIN));
  const cookie = start.headers
    .getSetCookie()
    .map((line) => line.split(';')[0])
    .join('; ');
  const code = await app.request(`${ORIGIN}/code/authorize`, {
    body: new URLSearchParams({
      action: 'request',
      email: 'ana@example.com',
      verify_email: '',
    }),
    headers: { cookie, origin: ORIGIN },
    method: 'POST',
  });
  return { code: await code.text(), start: await start.text() };
}

type Fetch = ReturnType<typeof vi.fn>;

/** Loads a page in jsdom and runs its inline script, as a browser would */
async function open(html: string, fetch: Fetch = vi.fn()) {
  const dom = new JSDOM(html, {
    beforeParse(window) {
      Object.assign(window, { fetch });
    },
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    url: `${ORIGIN}/code/authorize`,
  });
  const { document } = dom.window;
  // jsdom fires DOMContentLoaded (the script's init) after the constructor
  if (document.readyState !== 'complete') {
    await new Promise((resolve) =>
      dom.window.addEventListener('load', resolve),
    );
  }
  const $ = <T extends Element = HTMLElement>(selector: string) => {
    const el = document.querySelector<T>(selector);
    if (!el) throw new Error(`${selector} not found`);
    return el;
  };
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const submit = (form: HTMLFormElement) => {
    const event = new dom.window.Event('submit', {
      bubbles: true,
      cancelable: true,
    });
    form.dispatchEvent(event);
    return event;
  };
  return { $, document, dom, submit, type };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the inline script', () => {
  it('is served with its backslashes (no template literal eats them)', async () => {
    const { start } = await renderPages();
    expect(CLIENT_SCRIPT).toContain(String.raw`replace(/\D/g,'')`);
    expect(CLIENT_SCRIPT).toContain(String.raw`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`);
    expect(start).toContain(CLIENT_SCRIPT);
  });

  it('marks the page as scripted before the body is drawn', async () => {
    const { start } = await renderPages();
    const { document } = await open(start);
    expect(document.documentElement.classList.contains('js')).toBe(true);
  });
});

/** The code page as the issuer answers a wrong code (digits put back) */
const wrongPageOf = (code: string, digits: string) =>
  code
    .replace('data-state="typing"', 'data-state="wrong"')
    .replace('<title>Check your email', '<title>Error: Check your email')
    .replace('class="a-otp"', 'class="a-otp bad shake"')
    .replace('value=""', `value="${digits}"`)
    .replace(
      '<p class="t-caption t-gap-8" id="code-h">',
      '<p class="a-msg" id="code-e" role="alert"><span>That code isn’t right.</span></p><p class="t-caption t-gap-8" id="code-h">',
    );

const slotDigits = (slots: Element) =>
  [...slots.querySelectorAll('.a-sl b')].map((b) => b.textContent).join('');

describe('the code field', () => {
  it('keeps only the digits of a pasted line, paints six slots and submits itself', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(() => new Promise(() => undefined));
    const { $, type } = await open(code, fetch);
    const input = $<HTMLInputElement>('#code');

    type(input, 'Your tvseri.es code: 482 913');

    expect(input.value).toBe('482913');
    const slots = [...$('.a-otp').querySelectorAll('.a-sl b')].map(
      (b) => b.textContent,
    );
    expect(slots.join('')).toBe('482913');
    expect($('.a-pg').getAttribute('data-state')).toBe('checking');
    expect($('#cf .a-btn').getAttribute('data-v')).toBe('busy');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    // Not `form.action`: the form's `action` input shadows it
    expect(url).toBe('/code/authorize');
    expect((init.headers as Record<string, string>)['x-tvs-js']).toBe('1');
    const body = init.body as FormData;
    expect(body.get('code')).toBe('482913');
    expect(body.get('action')).toBe('verify');
  });

  it('takes “482-913” and a code typed digit by digit', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(() => new Promise(() => undefined));
    const { $, type } = await open(code, fetch);
    const input = $<HTMLInputElement>('#code');

    type(input, '4');
    type(input, '48');
    expect($('.a-pg').getAttribute('data-state')).toBe('typing');
    expect($('.a-otp').querySelectorAll('.a-sl.f')).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();

    type(input, '482-913');
    expect(input.value).toBe('482913');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows a wrong code in place: digits kept and drawn selected, the alert, “Error:” in the title', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(
      async () =>
        new Response(wrongPageOf(code, '111111'), {
          headers: { 'content-type': 'text/html' },
        }),
    );
    const { $, document, type } = await open(code, fetch);

    type($<HTMLInputElement>('#code'), '111111');
    await settle();
    await settle();

    expect(document.title).toBe('Error: Check your email · tvseri.es');
    expect($('.a-pg').getAttribute('data-state')).toBe('wrong');
    expect($('#code-e').textContent).toContain('That code isn’t right.');
    const input = $<HTMLInputElement>('#code');
    expect(document.activeElement).toBe(input);
    // The slots keep the digits, drawn selected; the field is empty, so
    // whatever is typed or pasted next is a new code
    expect(slotDigits($('.a-otp'))).toBe('111111');
    expect($('.a-otp').classList.contains('sel')).toBe(true);
    expect(input.value).toBe('');

    // Typing replaces them and clears the error state
    type(input, '7');
    expect($('.a-pg').getAttribute('data-state')).toBe('typing');
    expect($('.a-otp').classList.contains('bad')).toBe(false);
    expect(slotDigits($('.a-otp'))).toBe('7');
  });

  it('after a wrong code, never mixes old and new digits and sends nothing until six new ones are in', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(() => new Promise(() => undefined));
    // The wrong page as the issuer serves it (also without the script)
    const { $, dom, type } = await open(wrongPageOf(code, '111111'), fetch);
    const input = $<HTMLInputElement>('#code');
    expect($('.a-otp').classList.contains('sel')).toBe(true);

    // A click on the 3rd slot, then a new code digit by digit: the caret
    // can't land between old digits, there are none in the field
    input.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(input.value).toBe('');
    for (const digits of ['4', '48', '482', '4829', '48291']) {
      type(input, digits);
    }
    expect(slotDigits($('.a-otp'))).toBe('48291');
    expect(fetch).not.toHaveBeenCalled();
    type(input, '482913');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as FormData).get('code')).toBe('482913');
  });

  it('after a wrong code, a paste replaces the whole value and Backspace clears it', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(() => new Promise(() => undefined));
    const { $, dom, type } = await open(wrongPageOf(code, '111111'), fetch);
    const input = $<HTMLInputElement>('#code');

    input.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace',
      }),
    );
    expect($('.a-pg').getAttribute('data-state')).toBe('typing');
    expect(slotDigits($('.a-otp'))).toBe('');
    expect(fetch).not.toHaveBeenCalled();

    type(input, 'Code: 482 913');
    expect(input.value).toBe('482913');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends nothing on Sign in right after a wrong code', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(() => new Promise(() => undefined));
    const { $, submit } = await open(wrongPageOf(code, '111111'), fetch);

    submit($<HTMLFormElement>('#cf'));
    expect(fetch).not.toHaveBeenCalled();
    expect($('.a-pg').getAttribute('data-state')).toBe('wrong');
  });

  it('shows “Signed in · taking you back” when the issuer answers with the redirect', async () => {
    const { code } = await renderPages();
    const fetch = vi.fn(async () =>
      Response.json({
        next: 'http://localhost/api/auth/callback?code=c&state=s',
      }),
    );
    const { $, dom, type } = await open(code, fetch);
    dom.virtualConsole?.removeAllListeners('jsdomError');

    type($<HTMLInputElement>('#code'), '482913');
    await settle();
    await settle();

    expect($('.a-pg').getAttribute('data-state')).toBe('ok');
    expect($('#cf .a-btn').getAttribute('data-v')).toBe('ok');
  });
});

describe('the resend cooldown', () => {
  it('starts at 0:30 on a page that follows a send, and holds the resend link', async () => {
    const { code } = await renderPages();
    const { $, dom } = await open(code);

    expect($('#res-in').hidden).toBe(false);
    expect($('#res-in').textContent).toBe(' in 0:30');
    const button = $('#rsb');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    const click = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it('is off on a page that did not send (a wrong code, a failed resend)', async () => {
    const { code } = await renderPages();
    const { $ } = await open(code.replace('data-fresh=""', ''));

    expect($('#res-in').hidden).toBe(true);
    expect($('#rsb').hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('the email form', () => {
  it('stops an address that isn’t one and says so under the field', async () => {
    const { start } = await renderPages();
    const { $, document, submit, type } = await open(start);
    const input = $<HTMLInputElement>('#em');

    type(input, 'ana@example');
    const event = submit($<HTMLFormElement>('#ef'));

    expect(event.defaultPrevented).toBe(true);
    expect($('#em-m').hidden).toBe(false);
    expect($('#em-m').textContent).toContain(
      'That doesn’t look like an email address.',
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.parentElement?.classList.contains('bad')).toBe(true);
    expect(document.activeElement).toBe(input);

    type(input, 'ana@example.com');
    expect($('#em-m').hidden).toBe(true);
  });

  it('selects an address that was put back (Change on the code page)', async () => {
    const { app } = createTestApp();
    const start = await app.request(authorizeUrl(ORIGIN));
    const cookie = start.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .join('; ');
    const changed = await app.request(`${ORIGIN}/code/authorize`, {
      body: new URLSearchParams({ action: 'change', email: 'ana@exmaple.com' }),
      headers: { cookie, origin: ORIGIN },
      method: 'POST',
    });
    const { $, document } = await open(await changed.text());
    const input = $<HTMLInputElement>('#em');

    expect(input.value).toBe('ana@exmaple.com');
    // Focused and selected (jsdom has no selection range on an email
    // field; the e2e types over it)
    expect(document.activeElement).toBe(input);
  });

  it('sends a valid address with the button busy and the field read-only', async () => {
    const { start } = await renderPages();
    const { $, submit, type } = await open(start);
    const input = $<HTMLInputElement>('#em');

    type(input, '  ana@example.com ');
    const event = submit($<HTMLFormElement>('#ef'));

    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe('ana@example.com');
    expect(input.readOnly).toBe(true);
    expect($('#ef .a-btn').getAttribute('data-v')).toBe('busy');
    expect($('#live').textContent).toBe('Sending code');
  });

  it('shows “Opening Google…” on the Google button once clicked', async () => {
    const { start } = await renderPages();
    const { $, dom } = await open(start);
    dom.virtualConsole?.removeAllListeners('jsdomError');
    const google = $('a[href="/google/authorize"]');

    google.dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(google.getAttribute('data-v')).toBe('busy');
    expect(google.textContent).toContain('Opening Google…');
  });
});
