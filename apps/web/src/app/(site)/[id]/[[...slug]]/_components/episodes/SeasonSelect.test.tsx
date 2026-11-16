// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import ShowProvider from '../../_lib/ShowProvider';
import type { ShowSeason, ShowSummary } from '../../_lib/show';
import SeasonSelect from './SeasonSelect';
import { view } from './testData';

const s = (seasonNumber: number): ShowSeason => ({
  airDate: `${2020 + seasonNumber}-06-01`,
  airedEpisodeCount: 8,
  episodeCount: 8,
  seasonNumber,
  title: `Season ${seasonNumber}`,
});

const SHOW: ShowSummary = {
  backdrop: '',
  id: 1,
  logo: '',
  nextEpisodeToAir: null,
  seasons: [s(1), s(2), s(3), s(4)],
  slug: 'a-show',
  status: 'Ended',
  title: 'A Show',
};

function setup(seasonNumber = 2) {
  render(
    <ShowProvider show={SHOW}>
      <SeasonSelect
        nextUp={null}
        personal
        seasonNumber={seasonNumber}
        seriesId={1}
        view={view({ seasons: SHOW.seasons })}
      />
      <button type="button">After</button>
    </ShowProvider>,
  );
  return {
    trigger: screen.getByRole('combobox', { name: 'Season' }),
    user: userEvent.setup(),
  };
}

const activeOption = (trigger: HTMLElement) => {
  const id = trigger.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('SeasonSelect (listbox pattern)', () => {
  // The panel is a lazy chunk: load it once up front, as the idle preload does.
  beforeAll(async () => {
    await import('./SeasonPanel');
  });

  beforeEach(() => {
    // jsdom has no layout: the panel scrolls the active row into view.
    Element.prototype.scrollIntoView = () => {};
  });

  it('is a collapsed combobox that pops up a listbox', () => {
    const { trigger } = setup();
    expect(trigger.textContent).toBe('Season 2');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('opens on ↓ with the selected season as the active option', async () => {
    const { trigger, user } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    const listbox = await screen.findByRole('listbox', { name: 'Seasons' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(activeOption(trigger)).toBe(options[1]);
    expect(document.activeElement).toBe(trigger);
  });

  it('announces ↑↓, Home, End and type-ahead through the active descendant', async () => {
    const { trigger, user } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    const options = screen.getAllByRole('option');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(trigger)).toBe(options[2]);
    await user.keyboard('{Home}');
    expect(activeOption(trigger)).toBe(options[0]);
    await user.keyboard('{End}');
    expect(activeOption(trigger)).toBe(options[3]);
    await user.keyboard('2');
    expect(activeOption(trigger)).toBe(options[1]);
  });

  it('closes when Tab moves focus out', async () => {
    const { trigger, user } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'After' }),
    );
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
