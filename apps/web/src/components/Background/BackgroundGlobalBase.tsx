import { memo } from 'react';

/**
 * Sets the global background color CSS variable.
 *
 * Following the rendering-hydration-no-flicker pattern:
 * - Renders an inline script that executes synchronously before React hydrates
 * - Sets --main-background-color CSS variable on document.documentElement
 * - All elements (body, main, footer) read from this variable via CSS
 *
 * Why inline script (not useEffect/useInsertionEffect)?
 * - useEffect runs after paint → causes flash
 * - useInsertionEffect runs on client only → SSR has wrong color until hydration
 * - Inline script runs synchronously during HTML parsing → no flash ever
 *
 * Why this works for PPR navigation:
 * - Script updates the single CSS variable in place
 * - No style tags accumulate (the script just calls setProperty)
 * - Each navigation's script overwrites the previous value
 */
function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous execution
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.style.setProperty('--main-background-color','${color}')})()`,
      }}
    />
  );
}

export default memo(BackgroundGlobalBase);
