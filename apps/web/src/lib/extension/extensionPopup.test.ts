// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The extension's popup (apps/extension/popup.html + popup.js), run as the
 * extension runs it against a fake `chrome`: the consent screen names the
 * tvseri.es account a code links to before Continue may send anything.
 */

const EXTENSION = path.resolve(import.meta.dirname, '../../../../extension');

type Reply = unknown;
/** The worker's answer to the popup's check, per code */
let checkReply: (code: string) => Promise<Reply> = async () => null;
/** The worker's answer to Continue */
let linkReply: Reply = null;

const sendMessage = vi.fn(
  async (message: Readonly<{ code: string; type: string }>) =>
    message.type === 'check' ? checkReply(message.code) : linkReply,
);

type StorageListener = (
  changes: Readonly<Record<string, { newValue?: unknown }>>,
  area: string,
) => void;
const storageListeners: Array<StorageListener> = [];

const area = () => ({
  get: vi.fn(async () => ({})),
  remove: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
});

const chrome = {
  runtime: { sendMessage },
  storage: {
    local: area(),
    onChanged: {
      addListener: (listener: StorageListener) =>
        storageListeners.push(listener),
    },
    session: area(),
  },
};

beforeAll(async () => {
  const html = readFileSync(path.join(EXTENSION, 'popup.html'), 'utf8');
  document.body.innerHTML = new DOMParser().parseFromString(
    html,
    'text/html',
  ).body.innerHTML;
  vi.stubGlobal('chrome', chrome);
  // Continue notes the consent under a Web Lock, which jsdom lacks
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: (_name: string, run: () => unknown) => run() },
  });
  await import(pathToFileURL(path.join(EXTENSION, 'popup.js')).href);
  await settle();
  document.querySelector<HTMLButtonElement>('button[value="netflix"]')?.click();
  await settle();
});

beforeEach(() => {
  vi.stubGlobal('chrome', chrome);
  sendMessage.mockClear();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const input = () => document.querySelector<HTMLInputElement>('#code');
const line = () => document.querySelector('#account');
const note = () => document.querySelector('#status')?.textContent;
const continueButton = () =>
  document.querySelector<HTMLButtonElement>('#submit');

const type = (value: string) => {
  const field = input();
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }
};

describe('the consent screen’s account line', () => {
  it('names the account a full code links to, and only then lets Continue go', async () => {
    let answer: (reply: Reply) => void = () => undefined;
    checkReply = () =>
      new Promise((resolve) => {
        answer = resolve;
      });
    type('482');
    expect(sendMessage).not.toHaveBeenCalled();
    type('4829');
    expect(sendMessage).toHaveBeenCalledWith({
      code: '4829',
      service: 'netflix',
      type: 'check',
    });
    expect(line()?.textContent).toBe('Checking the code…');
    expect(continueButton()?.disabled).toBe(true);

    answer({ ok: true, username: '<i>jemoeder</i>' });
    await settle();
    expect(line()?.textContent).toBe('Links to <i>jemoeder</i> on tvseri.es');
    expect(line()?.querySelector('i')).toBeNull();
    expect(line()?.querySelector('b')?.textContent).toBe('<i>jemoeder</i>');
    expect(continueButton()?.disabled).toBe(false);
  });

  it('describes the code field with it', () => {
    expect(input()?.getAttribute('aria-describedby')).toContain('account');
    expect(line()?.getAttribute('aria-live')).toBe('polite');
  });

  it('keeps Continue off for a bad code, with the bad-code note', async () => {
    checkReply = async () => ({ ok: false, reason: 'bad-code' });
    type('1111');
    await settle();
    expect(line()?.textContent).toBe('');
    expect(note()).toMatch(/That code isn’t valid/);
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(continueButton()?.disabled).toBe(true);
  });

  it.each([
    [{ ok: false, reason: 'rate-limited' }, /Too many tries/],
    [{ ok: false, reason: 'unavailable' }, /couldn’t be reached/],
    [null, /couldn’t be reached/],
  ])('keeps Continue off when the site can’t say: %o', async (reply, text) => {
    checkReply = async () => reply;
    type('2222');
    await settle();
    expect(note()).toMatch(text);
    expect(continueButton()?.disabled).toBe(true);
    type('');
  });

  it('drops an answer for a code that was changed meanwhile', async () => {
    let answerFirst: (reply: Reply) => void = () => undefined;
    checkReply = () =>
      new Promise((resolve) => {
        answerFirst = resolve;
      });
    type('3333');
    checkReply = async () => ({ ok: false, reason: 'bad-code' });
    type('3334');
    await settle();
    answerFirst({ ok: true, username: 'someone' });
    await settle();
    expect(line()?.textContent).not.toMatch(/someone/);
    expect(continueButton()?.disabled).toBe(true);
  });

  it('clears the line when the code is no longer full', async () => {
    checkReply = async () => ({ ok: true, username: 'jemoeder' });
    type('4829');
    await settle();
    type('482');
    expect(line()?.textContent).toBe('');
    expect(continueButton()?.disabled).toBe(true);
  });

  it('shows the line again when the same code is entered over itself', async () => {
    checkReply = async () => ({ ok: false, reason: 'bad-code' });
    type('5555');
    await settle();
    sendMessage.mockClear();
    type('5555');
    await settle();
    // Not asked again (a wrong code counts against the limit), still said
    expect(sendMessage).not.toHaveBeenCalled();
    expect(note()).toMatch(/That code isn’t valid/);
    expect(continueButton()?.disabled).toBe(true);
  });

  it('turns Continue off when the link finds the code gone after its check', async () => {
    checkReply = async () => ({ ok: true, username: 'jemoeder' });
    type('6666');
    await settle();
    linkReply = { ok: false, reason: 'bad-code' };
    continueButton()?.click();
    await settle();
    await settle();
    expect(line()?.textContent).toBe('');
    expect(note()).toMatch(/That code isn’t valid/);
    expect(continueButton()?.disabled).toBe(true);
  });

  it('checks the code the site handed over before Continue may go', async () => {
    let answer: (reply: Reply) => void = () => undefined;
    checkReply = () =>
      new Promise((resolve) => {
        answer = resolve;
      });
    const pending = { at: Date.now(), code: '7777', service: 'netflix' };
    chrome.storage.session.get.mockResolvedValue({ pending } as never);
    for (const listener of storageListeners) {
      listener({ pending: { newValue: pending } }, 'session');
    }
    await settle();
    await settle();
    expect(input()?.value).toBe('7777');
    expect(sendMessage).toHaveBeenCalledWith({
      code: '7777',
      service: 'netflix',
      type: 'check',
    });
    expect(continueButton()?.disabled).toBe(true);
    answer({ ok: true, username: 'jemoeder' });
    await settle();
    expect(line()?.textContent).toBe('Links to jemoeder on tvseri.es');
    expect(continueButton()?.disabled).toBe(false);
  });
});
