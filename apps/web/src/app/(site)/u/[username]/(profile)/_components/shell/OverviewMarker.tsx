/**
 * Says "this is the overview" to the profile frame's CSS
 * (`overviewLayout.ts`). Static, so it is in the overview's shell. Rendered
 * by the overview's `@aside` entry, as a sub-page's is (`SubpageMarker`).
 */
export default function OverviewMarker() {
  return <span data-overview hidden />;
}
