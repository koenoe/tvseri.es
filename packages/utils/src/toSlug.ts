import slugify from 'slugify';

/**
 * The one slug rule: URLs (shows, people, genres without a landing) and
 * usernames. The API looks usernames up by it (`findUser`) and
 * `generateUsername` builds with it, so a username the web suggests
 * ("wren-c") is one the API accepts and finds again.
 *
 * `locale` picks a language's transliteration (German `ä` → `ae`).
 *
 *   toSlug('Wren C!') // 'wren-c'
 */
export default function toSlug(value: string, locale?: string): string {
  return slugify(value, { locale, lower: true, strict: true });
}
