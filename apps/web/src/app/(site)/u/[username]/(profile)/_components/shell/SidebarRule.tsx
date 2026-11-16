/**
 * The rule between the identity and what the sidebar holds under it (the
 * overview's blocks, a sub-page's navigator). Its own module: importing it
 * must not pull the overview blocks' client code into a sub-page.
 */
export default function SidebarRule() {
  return <span aria-hidden="true" className="h-0.5 rounded-2 bg-white/8" />;
}
