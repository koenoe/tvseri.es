import { describe, expect, it } from 'vitest';

import { renderCodeEmail } from './codeEmail';
import { CODE_TTL, formatCodeLifetime } from './codeLifetime';

const email = renderCodeEmail({ code: '482913', ttl: CODE_TTL });

const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

/** What a client renders: the body, without the hidden preheader */
const body = (html: string) =>
  (html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '').replace(
    /<div style="display:none[^>]*>[\s\S]*?<\/div>/,
    '',
  );

/** The visible text: tags gone, entities a reader can't see dropped */
const visibleText = (html: string) =>
  body(html)
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&zwnj;|&nbsp;/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const preheader = (html: string) =>
  html
    .match(/<div style="display:none[^>]*>([\s\S]*?)<\/div>/)?.[1]
    ?.replace(/(&#847;|&zwnj;|&nbsp;)+$/, '');

describe('the code email (EMCode2, A · Margin rule)', () => {
  it('ends the subject with the code, right after the word “code”', () => {
    expect(email.subject).toBe('Your tvseri.es sign-in code: 482913');
  });

  it('has the preheader: the expiry, then filler so the body doesn’t run on', () => {
    expect(preheader(email.html)).toBe('It works for 10 minutes.');
    expect(count(email.html, '&#847;&zwnj;&nbsp;')).toBe(40);
  });

  it('shows the wordmark, the code and the two lines, nothing else', () => {
    expect(visibleText(email.html)).toBe(
      'tvseri.es 482913 Your sign-in code. It works for 10 minutes. Didn’t ask for it? Ignore this email.',
    );
  });

  it('has the code exactly once, as one unbroken text run in its own element', () => {
    expect(count(email.html, '482913')).toBe(1);
    expect(body(email.html)).toMatch(
      /<div class="em-code" style="[^"]*letter-spacing:\.16em;font-variant-numeric:tabular-nums;[^"]*">482913<\/div>/,
    );
  });

  it('has nothing to load and nothing to click', () => {
    expect(email.html).not.toMatch(/<img/i);
    expect(email.html).not.toMatch(/<a[\s>]/i);
    expect(email.html).not.toMatch(/href=|src=|url\(/i);
    expect(email.html).not.toMatch(/https?:\/\//i);
    expect(email.text).not.toMatch(/https?:\/\//i);
  });

  it('gives a client no domain or address to link', () => {
    // The wordmark's dot sits behind a zero-width non-joiner
    expect(email.html).toContain(
      'tvseri<span style="font:inherit;color:inherit">&zwnj;.</span>es',
    );
    expect(email.html).not.toContain('tvseri.es');
    expect(email.html).not.toMatch(/[\w.+-]+@[\w-]+\.\w/);
    expect(email.html).toContain(
      '<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">',
    );
    expect(email.html).toContain('a[x-apple-data-detectors]');
  });

  it('is dark on the site’s ground, in English, for phones too', () => {
    expect(email.html).toContain('<html lang="en" dir="ltr">');
    expect(email.html).toContain('<meta name="color-scheme" content="dark">');
    expect(email.html).toContain('bgcolor="#1c2223"');
    expect(email.html).toContain('border-left:3px solid #ffffff');
    expect(email.html).toContain('@media (max-width:480px)');
  });

  it('has the hand-written text part', () => {
    expect(email.text).toBe(
      '482913\n\nYour sign-in code. It works for 10 minutes.\n\nDidn’t ask for it? Ignore this email.\n',
    );
  });

  it('says the code’s real lifetime, from the config', () => {
    const longer = renderCodeEmail({ code: '000111', ttl: 15 * 60 });
    expect(preheader(longer.html)).toBe('It works for 15 minutes.');
    expect(longer.text).toContain('It works for 15 minutes.');
    expect(longer.html).not.toContain('10 minutes');
    expect(formatCodeLifetime(60)).toBe('1 minute');
    expect(formatCodeLifetime(CODE_TTL)).toBe('10 minutes');
  });

  it('stays small: under 4 KB of HTML', () => {
    const bytes = Buffer.byteLength(email.html);
    expect(bytes).toBeLessThan(4 * 1024);
    expect(bytes).toBeGreaterThan(3000);
  });
});
