// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ManualSearch from './ManualSearch';

const answer = (
  series: ReadonlyArray<Readonly<{ id: number; title: string }>>,
) =>
  vi.fn(async () =>
    Response.json({
      best: 'series',
      people: [],
      series: series.map((show) => ({
        ...show,
        posterImage: null,
        releaseYear: null,
      })),
    }),
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const search = (query: string) =>
  render(<ManualSearch onPick={vi.fn()} onSkip={vi.fn()} query={query} />);

describe('ManualSearch', () => {
  it('says how the search went through a region that was there, empty, before it', async () => {
    vi.stubGlobal('fetch', answer([]));
    search('Cobra Kai');
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    await waitFor(() =>
      expect(region.textContent).toContain('“Cobra Kai” · no series.'),
    );
    expect(screen.getByRole('status')).toBe(region);
  });

  it('says how many series it found, beside their chips', async () => {
    vi.stubGlobal(
      'fetch',
      answer([
        { id: 1, title: 'Top Boy' },
        { id: 2, title: 'Top Gear' },
      ]),
    );
    search('Top');
    const region = screen.getByRole('status');

    await waitFor(() => expect(region.textContent).toBe('2 series found'));
    expect(screen.getByRole('button', { name: 'Top Boy' })).toBeTruthy();
  });

  it('opens again with a known answer through an empty region, then says it', async () => {
    vi.stubGlobal('fetch', answer([{ id: 3, title: 'Dark' }]));
    const first = search('Dark');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('1 series found'),
    );
    first.unmount();

    // Undo a pick and the search opens again on the same query, answered
    const texts: Array<string | null> = [];
    const spy = (node: HTMLElement | null) => {
      texts.push(node?.querySelector('[role="status"]')?.textContent ?? null);
    };
    render(
      <div ref={spy}>
        <ManualSearch onPick={vi.fn()} onSkip={vi.fn()} query="Dark" />
      </div>,
    );
    expect(texts[0]).toBe('');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('1 series found'),
    );
  });

  it('says so when search isn’t answering', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    search('Trust No One');
    const region = screen.getByRole('status');

    await waitFor(() =>
      expect(region.textContent).toBe(
        'Search isn’t answering. Try again in a moment.',
      ),
    );
  });
});
