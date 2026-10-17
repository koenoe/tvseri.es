/**
 * `use cache` keys on the serialised arguments, so `fn(1399)` and
 * `fn('1399')` would be two entries (and two API calls). Wrap cached getters
 * with this to normalise the id first.
 */
export const withStringId =
  <Rest extends unknown[], Result>(fn: (id: string, ...rest: Rest) => Result) =>
  (id: number | string, ...rest: Rest) =>
    fn(String(id), ...rest);
