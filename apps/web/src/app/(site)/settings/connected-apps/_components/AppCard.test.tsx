// @vitest-environment jsdom
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import AppTile from '@/components/brand/AppTile';
import AppCard from './AppCard';
import AppPill from './AppPill';
import AppStatus from './AppStatus';

const classOf = (ui: ReactElement) =>
  (render(ui).container.firstElementChild as HTMLElement).className;

/** The card, then its two surface layers: the ground and the tint over it */
const layersOf = (ui: ReactElement) => {
  const card = render(ui).container.firstElementChild as HTMLElement;
  const [ground, tint] = Array.from(card.children, (child) => child.className);
  return { card: card.className, ground, tint };
};

describe('the shared app card pieces', () => {
  it('keeps Plex’s available and connected looks, each on its own layer', () => {
    const available = layersOf(
      <AppCard brand="plex" surface="available">
        x
      </AppCard>,
    );
    expect(available.card).toBe(
      'flex flex-col overflow-hidden rounded-[20px] relative isolate',
    );
    expect(available.ground).toContain(
      'bg-white/3.5 shadow-[inset_0_2px_0_var(--color-plex),inset_0_0_0_1px_rgb(255_255_255/0.07)]',
    );
    // the tint is there, faded out, so going live fades it in
    expect(available.tint).toContain('bg-[#1f2425]');
    expect(available.tint).toContain('opacity-0');
    const connected = layersOf(
      <AppCard brand="plex" surface="connected">
        x
      </AppCard>,
    );
    expect(connected.tint).toContain('opacity-100');
    expect(connected.tint).toContain('duration-360');
    expect(
      classOf(
        <AppPill brand="plex" variant="available">
          Available
        </AppPill>,
      ),
    ).toBe(
      'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-caption font-medium transition-[background-color,color,box-shadow] duration-200 bg-white/10 text-white',
    );
    expect(classOf(<AppTile app="plex" />)).not.toContain('grayscale');
  });

  it('draws unavailable dimmed, without the brand edge', () => {
    const { ground, tint } = layersOf(
      <AppCard brand="netflix" surface="unavailable">
        x
      </AppCard>,
    );
    expect(ground).not.toContain('--color-netflix');
    expect(ground).toContain('bg-white/2');
    expect(tint).toContain('opacity-0');
    expect(classOf(<AppTile app="netflix" muted />)).toContain('grayscale');
    expect(
      classOf(
        <AppPill brand="netflix" variant="unavailable">
          Unavailable
        </AppPill>,
      ),
    ).toContain('text-white/60');
  });

  it('marks unavailable with a dash, the words still at full strength', () => {
    const { container } = render(<AppStatus dot="dash">Not here</AppStatus>);
    const mark = container.querySelector('[aria-hidden]') as HTMLElement;
    expect(mark.className).toContain('bg-size-[100%_2px]');
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'text-white/60',
    );
  });
});
