import {
  type ActorRefFrom,
  assign,
  fromPromise,
  type SnapshotFrom,
  setup,
} from 'xstate';
import { SESSION_REFRESH_THRESHOLD } from '@/constants';

const MAX_RETRIES = 3;

type SessionContext = {
  expiresAt: number;
  error: Error | null;
  retries: number;
};

type SessionInput = {
  expiresAt: number;
};

type SessionResponse = {
  accessToken: string | null;
  expiresAt: number | null;
};

const refreshSessionActor = fromPromise<SessionResponse, void>(async () => {
  const response = await fetch('/api/auth/session', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to refresh session');
  }
  return response.json();
});

function calculateDelay(expiresAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;
  const delay = (timeUntilExpiry - SESSION_REFRESH_THRESHOLD) * 1000;
  return Math.max(delay, 1000);
}

function hasValidToken(output: SessionResponse): boolean {
  return !!output.accessToken && !!output.expiresAt;
}

const sessionSetup = setup({
  actions: {
    onRefreshComplete: () => {},
  },
  actors: {
    refreshSession: refreshSessionActor,
  },
  delays: {
    refreshDelay: ({ context }) => calculateDelay(context.expiresAt),
  },
  guards: {
    isWithinMaxRetries: ({ context }) => context.retries < MAX_RETRIES,
  },
  types: {
    context: {} as SessionContext,
    events: {} as { type: 'REFRESH' },
    input: {} as SessionInput,
  },
});

export const sessionMachine = sessionSetup.createMachine({
  context: ({ input }) => ({
    error: null,
    expiresAt: input.expiresAt,
    retries: 0,
  }),
  id: 'session',
  initial: 'authenticated',
  states: {
    authenticated: {
      after: {
        refreshDelay: {
          target: 'refreshing',
        },
      },
      on: {
        REFRESH: 'refreshing',
      },
    },
    refreshing: {
      invoke: {
        onDone: [
          {
            actions: [
              assign({
                error: () => null,
                expiresAt: ({ event }) => event.output.expiresAt!,
                retries: () => 0,
              }),
              'onRefreshComplete',
            ],
            guard: ({ context, event }) =>
              hasValidToken(event.output) &&
              event.output.expiresAt !== context.expiresAt,
            reenter: true,
            target: 'authenticated',
          },
          {
            // Token is valid but expiresAt didn't change - server didn't refresh
            // Stay authenticated but don't reenter (keeps current delay calculation)
            guard: ({ event }) => hasValidToken(event.output),
            target: 'authenticated',
          },
          {
            target: 'unauthenticated',
          },
        ],
        onError: [
          {
            actions: assign({
              error: ({ event }) => event.error as Error,
              retries: ({ context }) => context.retries + 1,
            }),
            guard: 'isWithinMaxRetries',
            reenter: true,
            target: 'authenticated',
          },
          {
            target: 'unauthenticated',
          },
        ],
        src: 'refreshSession',
      },
    },
    unauthenticated: {
      entry: () => {
        window.location.reload();
      },
      type: 'final',
    },
  },
});

export type SessionMachine = typeof sessionMachine;
export type SessionActor = ActorRefFrom<SessionMachine>;
export type SessionSnapshot = SnapshotFrom<SessionMachine>;
