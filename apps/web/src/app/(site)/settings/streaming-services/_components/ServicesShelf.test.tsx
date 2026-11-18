// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { WatchProvider } from '@tvseri.es/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ServicesShelf from './ServicesShelf';

const service = (id: number, name: string): WatchProvider => ({
  id,
  logo: `https://image.tmdb.org/t/p/w92/${id}.jpg`,
  logoPath: `/${id}.jpg`,
  name,
});
const netflix = service(8, 'Netflix');
const iplayer = service(38, 'BBC iPlayer');
const plex = service(538, 'Plex');

const renderShelf = (selected: ReadonlyArray<WatchProvider>) => {
  const onReorder = vi.fn();
  const onToggle = vi.fn();
  render(
    <ServicesShelf
      onReorder={onReorder}
      onToggle={onToggle}
      popularTitle="Popular in the United Kingdom"
      selected={selected}
    />,
  );
  return { onReorder, onToggle };
};

const live = () => document.querySelector('[aria-live="polite"]')?.textContent;

afterEach(cleanup);

describe('ServicesShelf', () => {
  it('lists the services in order', () => {
    renderShelf([netflix, iplayer, plex]);
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Netflix, 1 of 3',
      'BBC iPlayer, 2 of 3',
      'Plex, 3 of 3',
    ]);
    expect(screen.getByText('Drag to reorder')).toBeTruthy();
  });

  it('the Move menu offers only the moves that apply and saves the new order', () => {
    const { onReorder } = renderShelf([netflix, iplayer, plex]);
    fireEvent.click(screen.getByRole('button', { name: 'Move Plex, 3 of 3' }));
    const items = screen
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(items).toEqual(['Move to top', 'Move up']);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to top' }));
    expect(onReorder).toHaveBeenCalledWith([plex.id, netflix.id, iplayer.id]);
    expect(live()).toBe('Plex moved from 3 to 1 of 3.');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('× removes the service, reads it out and moves focus to the next row’s ×', () => {
    const { onToggle } = renderShelf([netflix, iplayer, plex]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove BBC iPlayer' }));
    expect(onToggle).toHaveBeenCalledWith(iplayer);
    expect(live()).toBe('BBC iPlayer removed. 2 services.');
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Remove Plex',
    );
  });

  it('one service has nothing to order; none points down to Popular', () => {
    renderShelf([netflix]);
    expect(
      screen.getByText(/Where to watch shows this one on every series/),
    ).toBeTruthy();
    cleanup();
    renderShelf([]);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Popular in the United Kingdom')).toBeTruthy();
  });

  it('Space on a row picks it up and shows the keys; Escape puts it back', () => {
    renderShelf([netflix, iplayer]);
    const row = screen.getByRole('listitem', { name: 'BBC iPlayer, 2 of 2' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(live()).toBe('BBC iPlayer picked up, 2 of 2.');
    expect(screen.getByText('BBC iPlayer picked up.')).toBeTruthy();
    fireEvent.keyDown(row, { key: 'Escape' });
    expect(live()).toBe('BBC iPlayer back at 2 of 2.');
    expect(screen.queryByText('BBC iPlayer picked up.')).toBeNull();
  });
});
