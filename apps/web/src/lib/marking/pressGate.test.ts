import { afterEach, describe, expect, it, vi } from 'vitest';

import { pressMark, resetPressGate } from './pressGate';

/** A write that settles when the test says so */
function held() {
  let settle = () => {};
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

const click = (detail: number, clientX = 100, clientY = 200) => ({
  clientX,
  clientY,
  detail,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('pressMark: one press, one write', () => {
  afterEach(() => resetPressGate());

  it('the second click of a double-click presses nothing, wherever it lands', async () => {
    const run = vi.fn(() => Promise.resolve());
    expect(pressMark('1:next', click(1), run)).toBe(true);
    await flush();
    // the first write has settled: the second click is still not a press
    expect(pressMark('1:next', click(2), run)).toBe(false);
    expect(pressMark('1:S01E02', click(2, 400, 400), run)).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('a control is inert while its own write is out, and takes a new press after', async () => {
    const write = held();
    const run = vi.fn(() => write.promise);
    pressMark('1:next', click(0), run);
    // keyboard (detail 0) again on the same control: ignored while out
    expect(pressMark('1:next', click(0), run)).toBe(false);
    write.settle();
    await flush();
    expect(pressMark('1:next', click(0), run)).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a single click where a pending press was (a tap, a control that slid in) presses nothing', async () => {
    const write = held();
    const run = vi.fn(() => write.promise);
    pressMark('1:S01E04', click(1, 100, 200), run);
    expect(pressMark('1:S01E05', click(1, 103, 198), run)).toBe(false);
    write.settle();
    await flush();
    expect(pressMark('1:S01E05', click(1, 103, 198), run)).toBe(true);
  });

  it('quick presses on different controls elsewhere all go through (merged toasts)', () => {
    const run = vi.fn(() => held().promise);
    expect(pressMark('1:S01E04', click(1, 100, 200), run)).toBe(true);
    expect(pressMark('1:S01E05', click(1, 400, 200), run)).toBe(true);
    expect(pressMark('1:S01E06', click(0, 0, 0), run)).toBe(true);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('a write that fails re-arms the control', async () => {
    const run = vi.fn(() => Promise.reject(new Error('down')));
    pressMark('1:next', click(0), run);
    await flush();
    expect(pressMark('1:next', click(0), run)).toBe(true);
  });

  it('a press with no write (nothing to do) leaves the control armed', () => {
    const run = vi.fn(() => undefined);
    pressMark('1:next', click(0), run);
    expect(pressMark('1:next', click(0), run)).toBe(true);
  });

  it('a keyboard or assistive press has no spot: a click where it happened to point still goes through', () => {
    const run = vi.fn(() => held().promise);
    expect(pressMark('1:S01E04', click(0, 100, 200), run)).toBe(true);
    expect(pressMark('1:S01E05', click(1, 100, 200), run)).toBe(true);
    // a press with no event at all is keyed only
    expect(pressMark('1:S01E06', null, run)).toBe(true);
    expect(pressMark('1:S01E06', null, run)).toBe(false);
  });
});
