/**
 * A hard load of a profile path with no `@aside` entry of its own: nothing
 * under the identity. Every page under `(profile)` has an entry, so this
 * only covers paths that 404 anyway.
 */
export default function AsideDefault() {
  return null;
}
