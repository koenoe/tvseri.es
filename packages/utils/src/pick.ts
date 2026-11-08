/**
 * A copy of `object` with only `keys`. Keys whose value is undefined are left
 * out, so the copy serialises to the same JSON (and less RSC payload).
 */
const pick = <T extends object, const K extends keyof T>(
  object: T,
  keys: ReadonlyArray<K>,
): Pick<T, K> => {
  const picked: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    if (object[key] !== undefined) {
      picked[key] = object[key];
    }
  }

  return picked as Pick<T, K>;
};

export default pick;
