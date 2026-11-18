export type StubState = {
  /** the feature of the day, by kind (feature.ts); unset: the kind the day's rotation picks, as the API does */
  feature?: string;
  /** the toy of the day, by kind (toy.ts); unset: the day's rotation pick */
  toy?: string;
  /** the feature and the toy with long real titles (longTitles.ts), as from 2027 */
  longTitles?: boolean;
};

export type StubReply = Readonly<{ body?: unknown; status: number }>;

/** The signed-in viewer of a token route (undefined: no or unknown token) */
export type StubViewer = 'member' | 'new' | undefined;

export type StubRoute = (
  url: URL,
  state: StubState,
  viewer: StubViewer,
) => StubReply;

export const ok = (body: unknown): StubReply => ({ body, status: 200 });
export const notFound = (): StubReply => ({
  body: { message: 'Not found' },
  status: 404,
});
