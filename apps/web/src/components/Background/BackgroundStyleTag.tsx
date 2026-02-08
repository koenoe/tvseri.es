'use client';

import { memo, use } from 'react';

import { StyleTagRefContext } from './BackgroundProvider';

/**
 * Activity-proof <style> tag (render-only).
 *
 * Under React's <Activity> (used by Next.js cacheComponents), hidden routes
 * keep their DOM. A raw <style> tag inside a hidden Activity still applies
 * its CSS rules globally — display:none on a parent does NOT disable <style>.
 *
 * This component registers its <style> element ref via StyleTagRefContext
 * so that BackgroundProvider can toggle the `media` attribute in its own
 * useLayoutEffect:
 * - SSR: no media attribute, style is active immediately (no flash)
 * - BackgroundProvider setup: sets media="" (re-enable after Activity restore)
 * - BackgroundProvider cleanup: sets media="not all" (disable when Activity hides)
 *
 * By having BackgroundProvider own BOTH the CSS variable on <html> AND the
 * style tag media toggle in a single effect, we eliminate the parent-child
 * effect ordering window that caused stale background colors during
 * Activity re-show.
 *
 * @see https://shud.in/thoughts/build-bulletproof-react-components#make-it-activity-proof
 */
function BackgroundStyleTag({ css }: Readonly<{ css: string }>) {
  const styleTagRef = use(StyleTagRefContext);

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for inline CSS
      dangerouslySetInnerHTML={{ __html: css }}
      ref={styleTagRef}
    />
  );
}

BackgroundStyleTag.displayName = 'BackgroundStyleTag';

export default memo(BackgroundStyleTag);
