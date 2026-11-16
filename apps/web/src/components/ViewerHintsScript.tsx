import { viewerHintsScript } from '@/lib/viewer/viewerHintsScript';

const scriptHtml = { __html: viewerHintsScript };

/**
 * The root layout's one pre-paint script (`lib/viewer/viewerHintsScript.ts`:
 * signed-in-only space, owner or visitor placeholders, the placeholders'
 * hints, Discover's region line, the header's username and glass): plain,
 * synchronous and tiny. Not next/script: in the App Router a
 * beforeInteractive inline script only runs once Next's async bootstrap
 * loads, which can be after first paint.
 */
export default function ViewerHintsScript() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: a static pre-paint script
      dangerouslySetInnerHTML={scriptHtml}
    />
  );
}
