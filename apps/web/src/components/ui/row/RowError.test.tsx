// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RowError, { RowErrorCard, SectionError } from './RowError';
import { GHOST_FILL } from './RowGhosts';
import RowSkeleton from './RowSkeleton';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('RowError', () => {
  it('keeps the row header and says only this row failed', () => {
    const onRetry = vi.fn();
    render(
      <RowError
        id="hidden-gems"
        onRetry={onRetry}
        state="failed"
        subtitle="Loved by the few who found them"
        title="Hidden gems"
      />,
    );
    expect(screen.getByRole('region', { name: 'Hidden gems' })).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Hidden gems didn’t load.');
    expect(alert.textContent).toContain('The rest of the page is fine.');
    // plain, functional copy (no jokes)
    expect(alert.textContent).not.toContain('cue');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps its Try again in place, aria-disabled and saying it is trying, while it retries', () => {
    render(<RowError id="hidden-gems" state="retrying" title="Hidden gems" />);
    const region = screen.getByRole('region', { name: 'Hidden gems' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.textContent).toContain('Hidden gems didn’t load.');
    expect(region.textContent).toContain('Only this row reloads.');
    const button = screen.getByRole('button', { name: 'Loading…' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});

describe('RowError unavailable', () => {
  it('says the row didn’t load, settled (not busy), with a Try again that refreshes the route', () => {
    render(
      <RowError id="hidden-gems" state="unavailable" title="Hidden gems" />,
    );
    const region = screen.getByRole('region', { name: 'Hidden gems' });
    expect(region.getAttribute('aria-busy')).not.toBe('true');
    expect(region.textContent).toContain('Hidden gems didn’t load.');
    expect(region.textContent).toContain('The rest of the page is fine.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    // static content from the prerender, not a change to announce
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('draws the failed slots (dashed), not the loading fill', () => {
    const { container } = render(
      <RowError id="hidden-gems" state="unavailable" title="Hidden gems" />,
    );
    const slot = container.querySelector('[aria-hidden] > span > span');
    expect(slot?.className).toContain('border-dashed');
    expect(slot?.className).not.toContain(GHOST_FILL);
  });
});

describe('RowErrorCard', () => {
  it('is the same card on its own, for a section that isn’t a row', () => {
    render(<RowErrorCard state="unavailable" title="Where to start" />);
    expect(document.body.textContent).toContain('Where to start didn’t load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('RowSkeleton', () => {
  it('holds the row’s place under its title while it loads', () => {
    render(<RowSkeleton id="top-picks" title="Top Picks for November" />);
    const region = screen.getByRole('region', {
      name: 'Top Picks for November',
    });
    expect(region.getAttribute('aria-busy')).toBe('true');
  });
});

describe('RowError with the row’s captions', () => {
  it('keeps the lines under each tile its skeleton draws, so the failed row is as tall (on Discover)', () => {
    const { container } = render(
      <RowError
        caption="hub"
        id="essentials"
        state="unavailable"
        title="Essentials"
      />,
    );
    const { container: plain } = render(
      <RowError id="essentials-plain" state="unavailable" title="Essentials" />,
    );
    const slots = (root: HTMLElement) =>
      root.querySelector('[aria-hidden] > span')?.childElementCount ?? 0;
    expect(slots(container)).toBe(slots(plain) + 1);
  });
});

describe('RowError where the row stood', () => {
  it('starts its slots as far under the header as the skeleton and the loaded row do (the look’s rail offset), so the rows below don’t move', () => {
    const rail = (root: HTMLElement) =>
      root.querySelector('[aria-hidden]')?.closest('[class*="pb-6"]')
        ?.className;
    const { container: failed } = render(
      <RowError
        id="top-picks"
        look="home"
        state="unavailable"
        title="Top Picks"
      />,
    );
    const { container: loading } = render(
      <RowSkeleton id="top-picks-loading" look="home" title="Top Picks" />,
    );
    expect(rail(failed)).toContain('pt-[var(--row-rail-pt,24px)]');
    expect(rail(failed)).not.toMatch(/(^|\s)(md:)?pt-(4|7)(\s|$)/);
    expect(rail(loading)).toContain('pt-[var(--row-rail-pt,24px)]');
  });
});

describe('SectionError unavailable', () => {
  it('keeps the section’s placeholder under the card, settled and out of the tree, and is not announced', () => {
    const { container } = render(
      <SectionError
        placeholder={<div data-testid="stage" style={{ height: 860 }} />}
        state="unavailable"
        title="Trending this week"
      />,
    );
    const holder = screen.getByTestId('stage').parentElement;
    expect(holder?.getAttribute('aria-hidden')).toBe('true');
    expect(holder?.hasAttribute('inert')).toBe(true);
    // settled: the placeholder doesn't pulse under a failure
    expect(holder?.parentElement?.className).toContain('[&_*]:animate-none');
    // not a tile row: no row region with dashed slots
    expect(container.querySelector('.border-dashed')).toBeNull();
    expect(container.textContent).toContain('Trending this week didn’t load.');
    // in the prerendered page from the start: read in order, not announced
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
