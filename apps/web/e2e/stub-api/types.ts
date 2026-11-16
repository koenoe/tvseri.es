/**
 * The stub API's route shape (see README.md). A fixture file in `fixtures/`
 * exports `routes`; the server loads every file there, so streams add their
 * own file instead of editing a shared list.
 */
export type StubRequest = Readonly<{
  body: unknown;
  /** Request headers the fixtures read, e.g. `authorization` on token routes. */
  headers: Readonly<Record<string, string | undefined>>;
  method: string;
  /** Values for the route's `:name` placeholders. */
  params: Readonly<Record<string, string>>;
  path: string;
  query: URLSearchParams;
}>;

export type StubResponse = Readonly<{
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  status?: number;
}>;

export type StubRoute = Readonly<{
  /** Defaults to GET. */
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  /** `/series/:id/season/:season`; matched segment by segment. */
  path: string;
  /** `undefined`: not mine, try the next matching route. */
  handle: (
    request: StubRequest,
  ) => StubResponse | undefined | Promise<StubResponse | undefined>;
}>;
