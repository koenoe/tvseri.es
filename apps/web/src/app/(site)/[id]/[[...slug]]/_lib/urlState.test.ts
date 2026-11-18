// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeEpisode,
  closeHistory,
  openEpisode,
  openHistory,
} from './urlState';

const SHOW = '/136315/the-bear';
const url = () => `${window.location.pathname}${window.location.search}`;

describe('the overlays’ history entries', () => {
  let back: ReturnType<typeof vi.spyOn>;
  let push: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    window.history.replaceState(null, '', SHOW);
    back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    push = vi.spyOn(window.history, 'pushState');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opening the history sheet pushes one entry; closing it goes back', () => {
    openHistory();
    expect(push).toHaveBeenCalledTimes(1);
    expect(url()).toBe(`${SHOW}?history`);
    closeHistory();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('a direct ?history URL closes in place, with no Back', () => {
    window.history.replaceState(null, '', `${SHOW}?history&season=2`);
    closeHistory();
    expect(back).not.toHaveBeenCalled();
    expect(url()).toBe(SHOW);
  });

  it('switching overlays reuses the entry: closing then leaves both', () => {
    openEpisode({ episodeNumber: 6, seasonNumber: 3 });
    openHistory(3);
    expect(push).toHaveBeenCalledTimes(1);
    expect(url()).toBe(`${SHOW}?season=3&history`);
    closeHistory();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('stepping the modal replaces its entry; closing goes back', () => {
    openEpisode({ episodeNumber: 1, seasonNumber: 1 });
    openEpisode({ episodeNumber: 2, seasonNumber: 1 });
    expect(push).toHaveBeenCalledTimes(1);
    expect(url()).toBe(`${SHOW}?season=1&episode=2`);
    closeEpisode();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
