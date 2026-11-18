import { createHash } from 'node:crypto';

import font from '../assets/inter.woff2';
import { CLIENT_SCRIPT } from './client';
import baseCss from './css/base.css';
import codeCss from './css/code.css';
import errorCss from './css/error.css';
import startCss from './css/start.css';

const sha256 = (data: string | Uint8Array, encoding: 'base64' | 'hex') =>
  createHash('sha256').update(data).digest(encoding);

/**
 * Inter (opsz + wght 400–700, Latin), self-hosted. The subset is committed;
 * its path carries the content hash, so browsers and CloudFront keep it a year.
 */
export const FONT = {
  body: font,
  path: `/assets/inter-${sha256(font, 'hex').slice(0, 10)}.woff2`,
} as const;

// Comments and line breaks are for us, not for the wire
const pack = (...parts: readonly string[]) =>
  parts
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n+/g, '')
    .replaceAll(';}', '}')
    .replace('__FONT_URL__', FONT.path);

/** Each page inlines the shared rules plus its own (a small byte budget) */
export const CSS = {
  code: pack(baseCss, codeCss),
  error: pack(baseCss, errorCss),
  start: pack(baseCss, startCss),
} as const;

export type PageKind = keyof typeof CSS;

export const SCRIPT = CLIENT_SCRIPT;

const hashSource = (text: string) => `'sha256-${sha256(text, 'base64')}'`;

/**
 * The CSP of every HTML page on the auth origin: nothing loads from another
 * origin, and the only script and style are the two inline blocks above,
 * allowed by hash. `form-action` lists the clients' callback origins too:
 * the code form's 302 to the site counts as part of the form submission.
 */
export const contentSecurityPolicy = (formTargets: readonly string[]) =>
  [
    "default-src 'none'",
    `script-src ${hashSource(SCRIPT)}`,
    `style-src ${Object.values(CSS).map(hashSource).join(' ')}`,
    "font-src 'self'",
    'img-src data:',
    "connect-src 'self'",
    `form-action 'self' ${formTargets.join(' ')}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'none'",
  ].join('; ');

// A data URI: the favicon costs no request.
export const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1c2223"/><g transform="translate(3.80 22.64) scale(0.02 -0.02)" fill="#fff"><path d="M607 0H737L952 546H790L672 218.9L554 546H392ZM318 -6Q335 -6 354 -4Q373 -2 388 0V127Q378 126 369 125Q360 124 353 124Q322 124 301 133Q280 142 270 160.5Q260 179 260 207V416H388V546H260V670H110V630Q110 588 87.5 567Q65 546 23 546H18V416H110V197Q110 101 164.5 47.5Q219 -6 318 -6ZM1102 0C1157.2 0 1202 44.8 1202 100C1202 155.2 1157.2 200 1102 200C1046.8 200 1002 155.2 1002 100C1002 44.8 1046.8 0 1102 0Z"/></g></svg>',
)}`;
