/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx';

import { CSS, FAVICON, FONT, type PageKind, SCRIPT } from './assets';
import { CloseIcon, LockIcon, Logo } from './icons';

type Props = Readonly<{
  children: Child;
  /** Classes on `.a-pg` beyond the ground: `e-pg` for the error pages */
  className?: string;
  /** Which page's CSS to inline; the error page has no lock line */
  kind: PageKind;
  /** Where the logo and Not now go: the website on this stage */
  site: string;
  /** The code page's state, for the CSS and the script */
  state?: string;
  /** The page's name; an error after a post prefixes `Error:` (GOV.UK) */
  title: string;
}>;

/**
 * Every page on the auth origin: the logo (back to the site) and
 * “Not now” on top (the error pages: the logo only), the column, and the
 * lock line. The CSS and the one script are inline (allowed by hash in the
 * CSP), the font is preloaded from this origin and the favicon is a data
 * URI, so a page is one request plus the font, cached for a year.
 */
export function Layout({
  children,
  className,
  kind,
  site,
  state,
  title,
}: Props) {
  const pageClass = className ? `a-pg ${className}` : 'a-pg';
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#1c2223" name="theme-color" />
        <title>{`${title} · tvseri.es`}</title>
        <link href={FAVICON} rel="icon" />
        <link
          as="font"
          crossorigin=""
          href={FONT.path}
          rel="preload"
          type="font/woff2"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS[kind] }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      </head>
      <body>
        <div class={pageClass} data-state={state}>
          <header class="a-hd">
            <a aria-label="tvseri.es home" class="a-logo" href={site}>
              <Logo />
            </a>
            {/* The error pages' way out is their own Home button */}
            {kind === 'error' ? null : (
              <a class="a-nn" href={site}>
                <CloseIcon />
                <span>Not now</span>
              </a>
            )}
          </header>
          {children}
          {kind === 'error' ? null : (
            <p class="a-foot">
              <LockIcon />
              <span>We use your email only to sign you in.</span>
            </p>
          )}
          <p aria-live="polite" class="sr" id="live" />
        </div>
      </body>
    </html>
  );
}
