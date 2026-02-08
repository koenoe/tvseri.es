import BackgroundStyleTag from './BackgroundStyleTag';

type BackgroundStyleProps = Readonly<{
  color: string;
  enableTransitions?: boolean;
}>;

/**
 * BackgroundStyle renders a pre-hydration script and an Activity-proof style tag:
 * 1. Script runs BEFORE React hydration (synchronous, SSR only)
 * 2. Checks if this is a back navigation (window.__navIsBack)
 * 3. If back-nav: reads cached color from window.__bgCache and sets it
 * 4. If forward-nav: removes any inline style so the <style> tag takes effect
 *
 * The <style> tag uses BackgroundStyleTag which toggles media="not all"
 * when hidden by Activity, preventing stale CSS from leaking across routes.
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

  const css = `:root { --main-background-color: ${color}; }
body,
main,
main + div,
footer {
  background-color: var(--main-background-color) !important;
}
${transitionStyles}`;

  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous pre-hydration execution
        dangerouslySetInnerHTML={{ __html: inlineScript }}
      />
      <BackgroundStyleTag css={css} />
    </>
  );
}
