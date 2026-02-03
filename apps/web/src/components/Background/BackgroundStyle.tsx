type BackgroundStyleProps = Readonly<{
  color: string;
  enableTransitions?: boolean;
}>;

/**
 * BackgroundStyle renders an inline script and style that:
 * 1. Runs BEFORE React hydration (synchronous)
 * 2. Checks if this is a back navigation (window.__navIsBack)
 * 3. If back-nav: reads cached color from window.__bgCache and sets it
 * 4. If forward-nav: removes any inline style so the <style> tag takes effect
 *
 * This prevents any flash on back navigation because the correct
 * color is set before React even starts hydrating.
 *
 * For client-side SPA navigation, BackgroundProvider handles the color sync.
 *
 * @see rendering-hydration-no-flicker - Inline script prevents hydration mismatch flicker
 */
export default function BackgroundStyle({
  color,
  enableTransitions = false,
}: BackgroundStyleProps) {
  // Pre-hydration script that handles CSS variable
  // - Back navigation: restore from cache via inline style
  // - Forward navigation: remove inline style, let <style> tag win
  const inlineScript = `(function(){
var isBack=window.__navIsBack;
if(isBack){
var key=window.history.state?.key||'index';
var cached=window.__bgCache?.get?.(key);
if(cached)document.documentElement.style.setProperty('--main-background-color',cached.backgroundColor);
}else{
document.documentElement.style.removeProperty('--main-background-color');
}
})();`;

  const transitionStyles = enableTransitions
    ? `
body,
main,
main + div,
footer {
  transition-property: background-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}`
    : '';

  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous pre-hydration execution
        dangerouslySetInnerHTML={{ __html: inlineScript }}
      />
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: required for inline CSS
        dangerouslySetInnerHTML={{
          __html: `
:root { --main-background-color: ${color}; }
body,
main,
main + div,
footer {
  background-color: var(--main-background-color) !important;
}
${transitionStyles}`,
        }}
      />
    </>
  );
}
