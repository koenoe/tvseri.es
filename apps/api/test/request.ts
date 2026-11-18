import app from '@/app';

export const API_KEY = 'test-api-key';

type RequestOptions = Readonly<{
  method?: string;
  /** Signed in as this user id (a fake OpenAuth token) */
  as?: string;
  admin?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  apiKey?: string | null;
}>;

/** Sends a request through the whole Hono app, API key included by default */
export const request = (path: string, options: RequestOptions = {}) => {
  const headers: Record<string, string> = { ...options.headers };
  if (options.apiKey !== null) {
    headers['x-api-key'] = options.apiKey ?? API_KEY;
  }
  if (options.as) {
    headers.authorization = `Bearer test-token:${options.as}${options.admin ? ':admin' : ''}`;
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  return app.request(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method: options.method ?? 'GET',
  });
};
