import BackgroundStyleTag from './BackgroundStyleTag';
import { toPageColor } from './pageColor';

/**
 * The page colour in the server HTML: a hard refresh paints it on the first
 * frame. The colour is validated here, at the sink, so nothing but a
 * six-digit hex is ever written into the <style>.
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
  const css = `:root { --main-background-color: ${toPageColor(color)}; }
body,
main,
[data-site-footer] {
  background-color: var(--main-background-color) !important;
}`;

  return <BackgroundStyleTag css={css} />;
}
