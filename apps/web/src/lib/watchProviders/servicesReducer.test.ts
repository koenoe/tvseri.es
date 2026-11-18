import type { WatchProvider } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { movedOrder, servicesReducer, toggleAction } from './servicesReducer';

const provider = (id: number, name: string): WatchProvider => ({
  id,
  logo: `https://image.tmdb.org/t/p/w92/${id}.jpg`,
  logoPath: `/${id}.jpg`,
  name,
});

const netflix = provider(8, 'Netflix');
const iplayer = provider(38, 'BBC iPlayer');
const plex = provider(538, 'Plex');

describe('servicesReducer', () => {
  it('puts the services in the given order', () => {
    expect(
      servicesReducer([netflix, iplayer, plex], {
        order: [plex.id, netflix.id, iplayer.id],
        type: 'reorder',
      }),
    ).toEqual([plex, netflix, iplayer]);
  });

  it('keeps a service the order leaves out at the end, and the same order is the same list', () => {
    const state = [netflix, iplayer, plex];
    expect(
      servicesReducer(state, {
        order: [iplayer.id, netflix.id],
        type: 'reorder',
      }),
    ).toEqual([iplayer, netflix, plex]);
    expect(
      servicesReducer(state, {
        order: [netflix.id, iplayer.id, plex.id],
        type: 'reorder',
      }),
    ).toBe(state);
  });

  it('movedOrder moves one id to a new place', () => {
    expect(movedOrder([netflix, iplayer, plex], 2, 0)).toEqual([
      plex.id,
      netflix.id,
      iplayer.id,
    ]);
    expect(movedOrder([netflix, iplayer, plex], 0, 2)).toEqual([
      iplayer.id,
      plex.id,
      netflix.id,
    ]);
  });

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
