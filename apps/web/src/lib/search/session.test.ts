import { describe, expect, it } from 'vitest';

import type { SearchCell } from './sections';
import {
  INITIAL_SESSION,
  reduceSession,
  type SessionAction,
  type SessionContext,
  type SessionState,
  sessionView,
} from './session';
import { BRE, BRYAN, NOTHING } from './testData';

const RECENT: SearchCell = {
  href: '/136315/the-bear',
  id: 136315,
  image: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/the-bear.jpg',
  key: 'show-136315',
  kind: 'show',
  name: 'The Bear',
};

const CTX: SessionContext = { layout: 'desktop', recents: [RECENT] };

/** Runs actions in order; returns the last state and every cell opened. */
function run(actions: ReadonlyArray<SessionAction>, from = INITIAL_SESSION) {
  let state: SessionState = from;
  const opened: string[] = [];
  for (const action of actions) {
    const next = reduceSession(state, action, CTX);
    state = next.state;
    if (next.open) {
      opened.push(next.open.href);
    }
  }
  return { opened, state };
}

const typed = (query: string): SessionAction => ({ query, type: 'input' });

describe('reduceSession: typing and landing', () => {
  it('an empty field shows the recents with nothing marked', () => {
    const view = sessionView(INITIAL_SESSION, CTX);

    expect(view.mode).toBe('recents');
    expect(view.selected).toBe(-1);
  });

  it('typing makes a request pending; the recents stay, unmarked, until results land', () => {
    const { state } = run([typed('Bre')]);

    expect(state.status).toBe('pending');
    expect(sessionView(state, CTX).mode).toBe('recents');
    // Enter would open the search result, so no recent may look like its target
    expect(sessionView(state, CTX).selected).toBe(-1);
  });

  it('a recent marked with ↓ while the first query is pending is what Enter opens', () => {
    const { opened } = run([
      typed('b'),
      { key: 'ArrowDown', type: 'move' },
      { type: 'enter' },
      { key: 'b', type: 'request' },
      { key: 'b', results: BRE, type: 'land' },
    ]);

    expect(opened).toEqual(['/136315/the-bear']);
  });

  it('↓ and ↑ on the recents stay on the one row of chips; ← → move along it', () => {
    const two: SessionContext = {
      ...CTX,
      recents: [
        RECENT,
        {
          ...RECENT,
          href: '/1396/breaking-bad',
          id: 1396,
          key: 'show-1396',
          name: 'Breaking Bad',
        },
      ],
    };
    const step = (state: SessionState, key: 'ArrowDown' | 'ArrowRight') =>
      reduceSession(state, { key, type: 'move' }, two).state;
    const first = step(INITIAL_SESSION, 'ArrowDown');
    expect(sessionView(first, two).selected).toBe(0);
    expect(sessionView(step(first, 'ArrowDown'), two).selected).toBe(0);
    expect(sessionView(step(first, 'ArrowRight'), two).selected).toBe(1);
  });

  it('results land with the first cell marked', () => {
    const { state } = run([
      typed('Bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
    ]);
    const view = sessionView(state, CTX);

    expect(state.status).toBe('ready');
    expect(view.mode).toBe('results');
    expect(view.selected).toBe(0);
    expect(view.cells[0]?.name).toBe('Breaking Bad');
  });

  it('the previous results stay while the next ones load', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      typed('bryan'),
      { key: 'bryan', type: 'request' },
    ]);

    expect(state.status).toBe('pending');
    expect(sessionView(state, CTX).cells[0]?.name).toBe('Breaking Bad');
  });

  it('a late answer for an older query is ignored', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      typed('bryan'),
      { key: 'bryan', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
    ]);

    expect(state.status).toBe('pending');
    expect(state.results).toBeNull();
  });

  it('an answer for an earlier keystroke shows, but Enter waits for what was typed', () => {
    const { opened, state } = run([
      typed('br'),
      { key: 'br', type: 'request' },
      typed('bre'),
      { type: 'enter' },
      { key: 'br', results: BRYAN, type: 'land' },
    ]);

    expect(sessionView(state, CTX).cells[0]?.name).toBe('Bryan Cranston');
    expect(state.status).toBe('pending');
    expect(state.enterAhead).toBe(true);
    expect(opened).toEqual([]);
  });

  it('a failure for an earlier keystroke is ignored', () => {
    const { state } = run([
      typed('br'),
      { key: 'br', type: 'request' },
      typed('bre'),
      { key: 'br', type: 'fail' },
    ]);

    expect(state.status).toBe('pending');
  });

  it('typing the failed query again asks again', () => {
    const { state } = run([
      typed('boom'),
      { key: 'boom', type: 'request' },
      { key: 'boom', type: 'fail' },
      typed('boom '),
    ]);

    expect(state.status).toBe('pending');
  });

  it('no results: one line naming what was typed', () => {
    const { state } = run([
      typed(' brekaing  bad '),
      { key: 'brekaing bad', type: 'request' },
      { key: 'brekaing bad', results: NOTHING, type: 'land' },
    ]);
    const view = sessionView(state, CTX);

    expect(view.mode).toBe('none');
    expect(view.shownQuery).toBe('brekaing  bad');
  });

  it('a failed request shows the error row', () => {
    const { state } = run([
      typed('boom'),
      { key: 'boom', type: 'request' },
      { key: 'boom', type: 'fail' },
    ]);

    expect(sessionView(state, CTX).mode).toBe('error');
  });

  it('clearing the field goes back to the recents', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      typed('  '),
    ]);

    expect(state.status).toBe('idle');
    expect(sessionView(state, CTX).mode).toBe('recents');
  });

  it('a change that normalises to what is shown needs no request', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      typed('BRE '),
    ]);

    expect(state.status).toBe('ready');
  });
});

describe('reduceSession: Enter', () => {
  it('opens the marked first result', () => {
    const { opened } = run([
      typed('bryan'),
      { key: 'bryan', type: 'request' },
      { key: 'bryan', results: BRYAN, type: 'land' },
      { type: 'enter' },
    ]);

    expect(opened).toEqual(['/person/17419/bryan-cranston']);
  });

  it('opens what the arrows marked', () => {
    const { opened } = run([
      typed('bryan'),
      { key: 'bryan', type: 'request' },
      { key: 'bryan', results: BRYAN, type: 'land' },
      { key: 'ArrowRight', type: 'move' },
      { type: 'enter' },
    ]);

    expect(opened).toEqual(['/person/29092/bryan-brown']);
  });

  it('does nothing on the recents until an arrow marks one', () => {
    expect(run([{ type: 'enter' }]).opened).toEqual([]);
    expect(
      run([{ key: 'ArrowDown', type: 'move' }, { type: 'enter' }]).opened,
    ).toEqual(['/136315/the-bear']);
  });

  it('Enter-ahead: Enter while pending opens the first result as soon as it lands', () => {
    const { opened, state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      typed('bryan'),
      { type: 'enter' },
      { key: 'bryan', type: 'request' },
    ]);

    // not the stale Breaking Bad
    expect(opened).toEqual([]);
    expect(state.enterAhead).toBe(true);

    const landed = run([{ key: 'bryan', results: BRYAN, type: 'land' }], state);
    expect(landed.opened).toEqual(['/person/17419/bryan-cranston']);
    expect(landed.state.enterAhead).toBe(false);
  });

  it('Enter-ahead opens nothing when nothing is found or the request fails', () => {
    const pending = run([typed('xyz'), { type: 'enter' }]).state;

    expect(
      run(
        [
          { key: 'xyz', type: 'request' },
          { key: 'xyz', results: NOTHING, type: 'land' },
        ],
        pending,
      ).opened,
    ).toEqual([]);
    const failed = run(
      [
        { key: 'xyz', type: 'request' },
        { key: 'xyz', type: 'fail' },
      ],
      pending,
    );
    expect(failed.opened).toEqual([]);
    expect(failed.state.enterAhead).toBe(false);
  });

  it('typing again cancels an Enter-ahead', () => {
    const { state } = run([typed('bre'), { type: 'enter' }, typed('bryan')]);

    expect(state.enterAhead).toBe(false);
  });
});

describe('reduceSession: the marker', () => {
  it('arrows move the ring on the results', () => {
    const { state } = run([
      typed('bryan'),
      { key: 'bryan', type: 'request' },
      { key: 'bryan', results: BRYAN, type: 'land' },
      { key: 'ArrowDown', type: 'move' },
    ]);

    // the first face → the first poster below it
    expect(sessionView(state, CTX).selected).toBe(3);
  });

  it('a new answer marks its first cell again', () => {
    const { state } = run([
      typed('bryan'),
      { key: 'bryan', type: 'request' },
      { key: 'bryan', results: BRYAN, type: 'land' },
      { key: 'ArrowRight', type: 'move' },
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
    ]);

    expect(sessionView(state, CTX).selected).toBe(0);
  });
});

describe('sessionView: a stalled request', () => {
  const stall: SessionAction = { type: 'stall' };

  it('on the first query, ghost rows stand in for the recents: nothing to mark or open', () => {
    const { opened, state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      stall,
      { key: 'ArrowDown', type: 'move' },
      { type: 'enter' },
    ]);
    const view = sessionView(state, CTX);

    expect(view).toMatchObject({ cells: [], mode: 'ghosts', stale: true });
    expect(view.selected).toBe(-1);
    // Enter waits for the answer (Enter-ahead), not a hidden recent
    expect(opened).toEqual([]);
    expect(state.enterAhead).toBe(true);
  });

  it('previous results stay, operable, and are stale', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      typed('breaking'),
      { key: 'breaking', type: 'request' },
      stall,
    ]);
    const view = sessionView(state, CTX);

    expect(view.mode).toBe('results');
    expect(view.stale).toBe(true);
    expect(view.cells[0]?.href).toBe('/1396/breaking-bad');
  });

  it('a status line on screen is stale too', () => {
    const { state } = run([
      typed('boom'),
      { key: 'boom', type: 'request' },
      { key: 'boom', type: 'fail' },
      typed('boom'),
      { key: 'boom', type: 'request' },
      stall,
    ]);

    expect(sessionView(state, CTX)).toMatchObject({
      mode: 'error',
      stale: true,
    });
  });

  it('the answer landing ends it', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      stall,
      { key: 'bre', results: BRE, type: 'land' },
    ]);

    expect(sessionView(state, CTX)).toMatchObject({
      mode: 'results',
      stale: false,
    });
  });

  it('nothing pending, nothing stale (a late timer is ignored)', () => {
    const { state } = run([
      typed('bre'),
      { key: 'bre', type: 'request' },
      { key: 'bre', results: BRE, type: 'land' },
      stall,
    ]);

    expect(state.stalled).toBe(false);
  });
});
