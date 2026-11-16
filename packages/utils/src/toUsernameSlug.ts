import slugify from 'slugify';

/**
 * The username form of free text: the same slug the API looks usernames up
 * by (`apps/api` `findUser`) and `generateUsername` builds, so a username the
 * web suggests ("wren-c") is one the API accepts and finds again.
 *
 *   toUsernameSlug('Wren C!') // 'wren-c'
 */
export default function toUsernameSlug(value: string): string {
  return slugify(value, { lower: true, strict: true });
}
