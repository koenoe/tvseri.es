/** The origin the unit tests run the auth app on */
export const ORIGIN = 'http://localhost';

type App = Readonly<{
  request: (
    input: string,
    init?: RequestInit,
    env?: unknown,
  ) => Response | Promise<Response>;
}>;

/**
 * A tiny cookie jar around the app: what a browser would send back. `env`
 * stands in for the Lambda adapter's (the connection's address).
 */
export function browser(app: App, env?: unknown) {
  const jar = new Map<string, string>();
  const keep = (res: Response) => {
    for (const line of res.headers.getSetCookie()) {
      const [pair = '', ...attrs] = line.split(';');
      const [name = '', ...rest] = pair.split('=');
      const value = rest.join('=');
      const gone = attrs.some((a) => /max-age=0\b/i.test(a.trim())) || !value;
      if (gone) jar.delete(name.trim());
      else jar.set(name.trim(), value);
    }
    return res;
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  return {
    get: async (path: string, headers: Readonly<Record<string, string>> = {}) =>
      keep(
        await app.request(
          new URL(path, ORIGIN).toString(),
          {
            headers: { cookie: cookie(), ...headers },
          },
          env,
        ),
      ),
    jar,
    post: async (
      path: string,
      fields: Readonly<Record<string, string>>,
      headers: Readonly<Record<string, string>> = {},
    ) =>
      keep(
        await app.request(
          new URL(path, ORIGIN).toString(),
          {
            body: new URLSearchParams(fields),
            // What a browser sends with a form post from the auth pages
            headers: { cookie: cookie(), origin: ORIGIN, ...headers },
            method: 'POST',
          },
          env,
        ),
      ),
  };
}
