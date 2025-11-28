'use client';

import { useMachine } from '@xstate/react';
import { sessionMachine } from './sessionMachine';

export default function SessionSyncClient({
  expiresAt,
}: {
  expiresAt: number;
}) {
  useMachine(sessionMachine, {
    input: { expiresAt },
  });

  return null;
}
