'use client';

import { memo, use } from 'react';

import { StyleTagRefContext } from './BackgroundProvider';

/**
 * Activity-proof <style> (render-only). A hidden Activity keeps its DOM, and a
 * <style> under `display: none` still applies globally, so BackgroundProvider
 * toggles `media` through this ref: none in the server HTML (active at once,
 * no flash), `""` when shown, `"not all"` when hidden.
 *
 * @see https://shud.in/thoughts/build-bulletproof-react-components#make-it-activity-proof
 */
function BackgroundStyleTag({ css }: Readonly<{ css: string }>) {
  const styleTagRef = use(StyleTagRefContext);

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS built by BackgroundStyle from a validated hex colour only
      dangerouslySetInnerHTML={{ __html: css }}
      ref={styleTagRef}
    />
  );
}

BackgroundStyleTag.displayName = 'BackgroundStyleTag';

export default memo(BackgroundStyleTag);
