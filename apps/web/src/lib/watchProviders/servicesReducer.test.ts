import type { WatchProvider } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { servicesReducer, toggleAction } from './servicesReducer';

const provider = (id: number, name: string): WatchProvider => ({
  id,
  logo: `https://image.tmdb.org/t/p/w92/${id}.jpg`,
  logoPath: `/${id}.jpg`,
  name,
});

const netflix = provider(8, 'Netflix');
const iplayer = provider(38, 'BBC iPlayer');

describe('servicesReducer', () => {
  it('adds a service at the end', () => {
    expect(
      servicesReducer([netflix], { provider: iplayer, type: 'add' }),
    ).toEqual([netflix, iplayer]);
  });

  it('does not add a service twice', () => {
    const state = [netflix];
    expect(servicesReducer(state, { provider: netflix, type: 'add' })).toBe(
      state,
    );
  });

  it('removes a service by id and keeps the order of the rest', () => {
    expect(
      servicesReducer([netflix, iplayer], {
        provider: netflix,
        type: 'remove',
      }),
    ).toEqual([iplayer]);
  });

  it('leaves the list alone when removing one that is not there', () => {
    expect(
      servicesReducer([netflix], { provider: iplayer, type: 'remove' }),
    ).toEqual([netflix]);
  });
});

describe('toggleAction', () => {
  it('removes a selected service and adds an unselected one', () => {
    expect(toggleAction([netflix], netflix)).toEqual({
      provider: netflix,
      type: 'remove',
    });
    expect(toggleAction([netflix], iplayer)).toEqual({
      provider: iplayer,
      type: 'add',
    });
  });
});
