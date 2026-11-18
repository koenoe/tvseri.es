/**
 * Test double for the store `cookies()` from `next/headers` returns. Route
 * handler tests mock `next/headers` with it:
 *
 *   vi.mock('next/headers', async () => {
 *     const { fakeCookieStore } = await import('@/auth/testing/fakeCookieStore');
 *     return { cookies: async () => fakeCookieStore };
 *   });
 */

type CookieWrite = Readonly<{
  name: string;
  options?: Readonly<Record<string, unknown>>;
  value: string;
}>;

const jar = new Map<string, string>();
const writes: CookieWrite[] = [];

export const fakeCookieStore = {
  delete(nameOrOptions: string | Readonly<{ name: string; path?: string }>) {
    const name =
      typeof nameOrOptions === 'string' ? nameOrOptions : nameOrOptions.name;
    jar.delete(name);
    writes.push({ name, value: '' });
  },
  get(name: string) {
    const value = jar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  /** Empties the jar and sets these request cookies. */
  reset(cookies: Readonly<Record<string, string>> = {}) {
    jar.clear();
    writes.length = 0;
    for (const [name, value] of Object.entries(cookies)) {
      jar.set(name, value);
    }
  },
  set(
    name: string,
    value: string,
    options?: Readonly<Record<string, unknown>>,
  ) {
    jar.set(name, value);
    writes.push({ name, options, value });
  },
  /** Every set/delete in order; a delete is a write with an empty value. */
  get writes(): readonly CookieWrite[] {
    return writes;
  },
};

/** The last value written to a cookie: '' when deleted, undefined if untouched. */
export const lastWrite = (name: string): CookieWrite | undefined =>
  fakeCookieStore.writes.filter((write) => write.name === name).at(-1);
