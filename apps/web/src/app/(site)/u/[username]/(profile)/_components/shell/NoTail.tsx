/**
 * A sub-page's `@tail` entry: nothing. Every sub-page has one (as in
 * `@aside`), so a client navigation from the overview to a sub-page clears
 * the overview's last blocks instead of keeping them.
 */
export default function NoTail() {
  return null;
}
