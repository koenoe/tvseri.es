// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  LandingSwitch,
  LandingSwitchProvider,
  ROW_SWITCH_CLASS,
} from './LandingSwitch';

describe('LandingSwitch', () => {
  it('gives a tab the language of its label (WCAG 3.1.2)', () => {
    render(
      <LandingSwitchProvider>
        <LandingSwitch
          controls="wall"
          label="Show titles in"
          switchId="script"
          tabs={[
            { key: 'native', label: '日本語', lang: 'ja' },
            { key: 'romanized', label: 'Rōmaji', lang: 'ja-Latn' },
            { key: 'english', label: 'English' },
          ]}
        />
      </LandingSwitchProvider>,
    );
    expect(screen.getByRole('button', { name: '日本語' }).lang).toBe('ja');
    expect(screen.getByRole('button', { name: 'Rōmaji' }).lang).toBe('ja-Latn');
    expect(
      screen.getByRole('button', { name: 'English' }).hasAttribute('lang'),
    ).toBe(false);
  });
});

describe('a row switch on a phone', () => {
  it('sits 8 in from the row’s edge', () => {
    render(
      <LandingSwitchProvider>
        <LandingSwitch
          className={ROW_SWITCH_CLASS}
          controls="best-rail"
          label="Best of"
          switchId="best"
          tabs={[{ key: 'a', label: 'Before 2010' }]}
        />
      </LandingSwitchProvider>,
    );
    expect(screen.getByRole('group', { name: 'Best of' }).className).toContain(
      'max-md:ml-2',
    );
  });
});
