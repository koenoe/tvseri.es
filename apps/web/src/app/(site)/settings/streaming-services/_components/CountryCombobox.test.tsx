// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CountryCombobox from './CountryCombobox';

function setup(selected = 'GB') {
  const onClose = vi.fn();
  const onPick = vi.fn();
  render(
    <CountryCombobox
      id="combo"
      onClose={onClose}
      onPick={onPick}
      selected={selected}
    />,
  );
  const input = screen.getByRole('combobox', { name: 'Search countries' });
  return { input, onClose, onPick, user: userEvent.setup() };
}

const activeName = (input: HTMLElement) => {
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.textContent : undefined;
};

describe('CountryCombobox', () => {
  it('is an ARIA combobox: the input owns focus and points at the listbox', () => {
    const { input } = setup();

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { name: 'Countries' });
    expect(input.getAttribute('aria-controls')).toBe(list.id);
  });

  it('lists every country with its code and marks the saved one as current', () => {
    setup('GB');

    const options = screen.getAllByRole('option');
    const current = options.filter((o) => o.textContent?.includes('current'));
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe('United KingdomGBcurrent');
  });

  it('opens at the top, the active option being the selected one (APG)', () => {
    const { input } = setup('NL');
    expect(activeName(input)).toContain('Afghanistan');
    const selected = screen.getByRole('option', { selected: true });
    expect(selected.id).toBe(input.getAttribute('aria-activedescendant'));
  });

  it('filters by name and picks with Enter', async () => {
    const { input, onPick, user } = setup();

    await user.type(input, 'ireland');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(activeName(input)).toContain('Ireland');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]).toEqual(['IE']);
  });

  it('moves with the arrow keys and stops at the ends', async () => {
    const { input, user } = setup();

    await user.type(input, 'ger');
    const first = activeName(input);
    await user.keyboard('{ArrowDown}');
    expect(activeName(input)).not.toBe(first);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(activeName(input)).toBe(first);
  });

  it('picks the option you arrowed to', async () => {
    const { input, onPick, user } = setup();

    await user.type(input, 'ger');
    await user.keyboard('{ArrowDown}');
    const expected = activeName(input);
    await user.keyboard('{Enter}');

    const code = onPick.mock.calls[0]?.[0];
    const option = screen
      .getAllByRole('option')
      .find((o) => o.textContent?.endsWith(code));
    expect(option?.textContent).toBe(expected);
  });

  it('picks with a click', async () => {
    const { onPick, user } = setup();

    await user.click(screen.getByRole('option', { name: /Ireland/ }));

    expect(onPick.mock.calls[0]).toEqual(['IE']);
  });

  it('closes on Escape without picking', async () => {
    const { input, onClose, onPick, user } = setup();

    await user.type(input, 'x');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('says so when nothing matches, and Enter picks nothing', async () => {
    const { input, onPick, user } = setup();

    await user.type(input, 'qqqq');
    expect(screen.getByText('No country matches.')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    await user.keyboard('{Enter}');

    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('flags', () => {
  it('loads each flag as its own lazy file, not the whole set', () => {
    setup();
    const ireland = screen.getByRole('option', { name: /Ireland/ });
    const img = ireland.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/api/flags/IE');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });
});
