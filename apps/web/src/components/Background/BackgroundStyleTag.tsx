'use client';

import { memo, useLayoutEffect, useRef } from 'react';

/**
 * Activity-proof <style> tag.
 *
 * Under React's <Activity> (used by Next.js cacheComponents), hidden routes
 * keep their DOM. A raw <style> tag inside a hidden Activity still applies
 * its CSS rules globally — display:none on a parent does NOT disable <style>.
 *
 * This component toggles the media attribute:
 * - SSR: no media attribute, style is active immediately (no flash)
 * - useLayoutEffect setup: sets media="" (re-enable after Activity restore)
 * - useLayoutEffect cleanup: sets media="not all" (disable when Activity hides)
 *
 * @see https://shud.in/thoughts/build-bulletproof-react-components#make-it-activity-proof
 */
function BackgroundStyleTag({ css }: Readonly<{ css: string }>) {
  const ref = useRef<HTMLStyleElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.media = '';
    }
    return () => {
      if (ref.current) {
        ref.current.media = 'not all';
      }
    };
  }, []);

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for inline CSS
      dangerouslySetInnerHTML={{ __html: css }}
      ref={ref}
    />
  );
}

BackgroundStyleTag.displayName = 'BackgroundStyleTag';

export default memo(BackgroundStyleTag);
