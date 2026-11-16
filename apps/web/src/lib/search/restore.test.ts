import { describe, expect, it } from 'vitest';

import { forgetSession, restoreSession, saveSession } from './restore';
import { INITIAL_SESSION } from './session';
import { BRE } from './testData';

describe('restore per history entry', () => {
  const opened = {
    ...INITIAL_SESSION,
    query: 'bre',
    requested: 'bre',
    results: BRE,
    shown: 'bre',
    status: 'ready' as const,
  };

  it('gives back the query and results saved for that entry', () => {
    saveSession('entry-a', opened);

    expect(restoreSession('entry-a')).toEqual(opened);
    expect(restoreSession('entry-b')).toBeNull();
  });

  it('restores a settled session: no pending request, no Enter-ahead, nothing stale', () => {
    saveSession('entry-c', {
      ...opened,
      enterAhead: true,
      stalled: true,
      status: 'pending',
    });

    expect(restoreSession('entry-c')).toMatchObject({
      enterAhead: false,
      stalled: false,
      status: 'ready',
    });
  });

  it('forgets an entry (closed on purpose)', () => {
    saveSession('entry-d', opened);
    forgetSession('entry-d');

    expect(restoreSession('entry-d')).toBeNull();
  });
});
