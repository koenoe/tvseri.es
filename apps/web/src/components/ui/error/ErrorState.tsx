import type { CSSProperties, ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';

import ErrorScene from './ErrorScene';
import ErrorTitle from './ErrorTitle';
import type { ErrorBackdrop, ErrorStill } from './stills';

/**
 * No site footer under an error view. A `notFound()` or a thrown error inside
 * a page is caught below the `(site)` layout, so the layout's footer stays in
 * the tree beside the error view: the view's own rule hides it, in the server
 * HTML and from the first frame, with no client code, and goes with the view.
 * A rule, not a `body:has()`: that one re-checked the whole page on every
 * DOM change. The root 404/401/403/500 pages that replace the layout never
 * render a footer.
 */
const HIDE_SITE_FOOTER = '[data-site-footer],[data-footer-air]{display:none}';

type Props = Readonly<{
  /** Buttons, left to right (shared width on phones, 44px tall). */
  actions: ReactNode;
  body: ReactNode;
  /**
   * The episode-code kicker: 404 → S04E04, 401 → S04E01, 403 → S04E03,
   * 500 → S05E00, data down → S05E03, offline → Off air.
   */
  code: string;
  /** Under the actions, 48px down: “Or start something new” + posters. */
  discovery?: ReactNode;
  /** A caption 16px under the actions (the 500's Error ID). */
  footnote?: ReactNode;
  /** The site header, drawn over the still. */
  header?: ReactNode;
  /** The overline beside the code: “Page not found”. */
  kicker: string;
  /** Between the body and the actions (the 404's search field). */
  search?: ReactNode;
  /** The still, or the test card when offline. */
  still: ErrorBackdrop;
  title: ReactNode;
}>;

/**
 * An error page: a still from a show everyone knows,
 * faded into its own ground colour, with the problem in an episode-code
 * kicker, a title-1 headline, one line of what to do, and the way out right
 * under it. The quote and credit sit bottom right (desktop) or last (phone).
 * Static: no request data. Its own `<style>` hides the site footer while it
 * is on the page.
 */
export default function ErrorState({
  actions,
  body,
  code,
  discovery,
  footnote,
  header,
  kicker,
  search,
  still,
  title,
}: Props) {
  const page: CSSProperties = { backgroundColor: still.ground };
  const actionsClass = search ? 'mt-4' : 'mt-6';

  return (
    <div className="relative isolate flex min-h-dvh flex-col" style={page}>
      <style>{HIDE_SITE_FOOTER}</style>
      <ErrorScene backdrop={still} />
      {header}
      {/* The page container, as the header: at 1440 it is 112px */}
      <main className="relative mx-auto mt-auto w-full max-w-page px-gutter pt-12 pb-10 md:pb-16">
        <div className="flex flex-col items-start md:w-140">
          <div className="flex items-center gap-3">
            <Badge className="min-w-0 bg-white/16 px-2" variant="code">
              {code}
            </Badge>
            <span className="text-overline text-white/80 uppercase">
              {kicker}
            </span>
          </div>
          <ErrorTitle>{title}</ErrorTitle>
          <p className="mt-3 max-w-130 text-body text-white/80">{body}</p>
          {search ? <div className="mt-6 w-full md:w-120">{search}</div> : null}
          <div
            className={`${actionsClass} flex w-full items-center gap-2 md:gap-3 *:max-md:h-11 *:max-md:flex-1 *:max-md:px-3`}
          >
            {actions}
          </div>
          {footnote ? (
            <p className="mt-4 text-caption text-white/60 tabular-nums">
              {footnote}
            </p>
          ) : null}
          {discovery ? (
            <div className="mt-8 max-w-full md:mt-12">{discovery}</div>
          ) : null}
        </div>
        {'credit' in still ? <StillCredit still={still} /> : null}
      </main>
    </div>
  );
}

function StillCredit({ still }: Readonly<{ still: ErrorStill }>) {
  return (
    <figure className="mt-6 flex flex-col md:absolute md:right-gutter md:bottom-16 md:mt-0 md:max-w-90 md:items-end md:text-right">
      {still.quote ? (
        <span className="text-body-sm text-white/80">{still.quote}</span>
      ) : null}
      <figcaption className="text-caption text-white/60">
        {still.credit}
      </figcaption>
    </figure>
  );
}
