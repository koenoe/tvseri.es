/**
 * Says "this is a sub-page" to the profile frame's CSS (`subpage.ts`): the
 * identity drops Watches on, and a phone shows the compact identity. Static,
 * so it is in each sub-page's shell. Rendered by the sub-page's `@aside`
 * entry (a slot layout, so a shelf or month switch never remounts it).
 */
export default function SubpageMarker() {
  return <span data-subpage hidden />;
}
