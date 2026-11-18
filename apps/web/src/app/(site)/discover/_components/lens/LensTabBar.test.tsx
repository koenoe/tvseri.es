// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LENS_KEYS } from '../../_data/hubTiles';
import LensPanel from './LensPanel';
import { LensProvider } from './LensProvider';
import LensTabBar from './LensTabBar';

const renderLenses = () =>
  render(
    <LensProvider>
      <LensTabBar />
      {LENS_KEYS.map((lens) => (
        <LensPanel key={lens} lens={lens}>
          <a href={`/${lens}`}>{`${lens} tile`}</a>
        </LensPanel>
      ))}
    </LensProvider>,
  );

const tab = (name: string) => screen.getByRole('tab', { name });

describe('lens tabs (APG tabs)', () => {
  it('is one tablist with six tabs, Duration selected and the only tab stop', () => {
    renderLenses();
    const list = screen.getByRole('tablist', { name: 'Look at TV by' });
    expect(list).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((item) => item.textContent)).toEqual([
      'Duration',
      'Decade',
      'Country',
      'Language',
      'Network',
      'Theme',
    ]);
    expect(tab('Duration').getAttribute('aria-selected')).toBe('true');
    expect(tabs.map((item) => item.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
  });

  it('names each panel by its tab', () => {
    renderLenses();
    const panel = screen.getByRole('tabpanel', { name: 'Duration' });
    expect(panel.id).toBe(tab('Duration').getAttribute('aria-controls'));
  });

  it('moves and selects with the arrow keys, Home and End, wrapping', () => {
    renderLenses();
    tab('Duration').focus();
    fireEvent.keyDown(tab('Duration'), { key: 'ArrowRight' });
    expect(tab('Decade').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Decade'));
    expect(tab('Decade').tabIndex).toBe(0);
    expect(tab('Duration').tabIndex).toBe(-1);
    expect(screen.getByRole('tabpanel', { name: 'Decade' })).toBeTruthy();

    fireEvent.keyDown(tab('Decade'), { key: 'End' });
    expect(document.activeElement).toBe(tab('Theme'));
    fireEvent.keyDown(tab('Theme'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Duration'));
    fireEvent.keyDown(tab('Duration'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Theme'));
    fireEvent.keyDown(tab('Theme'), { key: 'Home' });
    expect(tab('Duration').getAttribute('aria-selected')).toBe('true');
  });

  it('selects a tab on click', () => {
    renderLenses();
    fireEvent.click(tab('Country'));
    expect(tab('Country').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Country' })).toBeTruthy();
  });

  it('fades the tiles up only once the viewer switches lens, never on the first paint', () => {
    renderLenses();
    const shown = screen.getByRole('tabpanel', { name: 'Duration' });
    expect(shown.hasAttribute('data-fade')).toBe(false);
    fireEvent.click(tab('Country'));
    const switched = screen.getByRole('tabpanel', { name: 'Country' });
    expect(switched.hasAttribute('data-fade')).toBe(true);
  });
});
