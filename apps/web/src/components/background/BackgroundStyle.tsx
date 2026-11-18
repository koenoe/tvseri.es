import BackgroundStyleTag from './BackgroundStyleTag';
import { PAGE_COLOUR_LIVE, toPageColor } from './pageColor';

/**
 * The page colour in the server HTML: a hard refresh paints it on the first
 * frame. The colour is validated here, at the sink, so nothing but a
 * six-digit hex is ever written into the <style>.
 *
 * Two copies. The in-page `<style>` (Activity-proof, `BackgroundStyleTag`)
 * sits where the page renders, in the body: a slow device parsing the
 * document can paint a frame or two of the ground before it reaches it. So the
 * colour is also hoisted into `<head>` (React 19 `<style precedence>`), where
 * it applies from the first frame, scoped to the document until the page's
 * provider takes over (`PAGE_COLOUR_LIVE`).
 *
 * There is no pre-hydration script: on a document load the history cache is
 * still empty, so there is nothing to restore before React runs. Back
 * navigations are restored by BackgroundProvider before paint.
 */
export default function BackgroundStyle({
  color,
}: Readonly<{
  color: string;
}>) {
  const hex = toPageColor(color);
  const css = `:root { --main-background-color: ${hex}; }
body,
main,
[data-site-footer] {
  background-color: var(--main-background-color) !important;
}`;
  const styleHref = `page-colour-${hex.slice(1)}`;

  return (
    <>
      <style
        href={styleHref}
        // biome-ignore lint/suspicious/noUnknownAttribute: React 19's hoistable <style> (into <head>), not a DOM attribute
        precedence="page-colour"
      >
        {`html:not([${PAGE_COLOUR_LIVE}]) { --main-background-color: ${hex}; }`}
      </style>
      <BackgroundStyleTag css={css} />
    </>
  );
}
