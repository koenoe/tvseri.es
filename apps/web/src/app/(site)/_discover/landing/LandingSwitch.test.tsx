// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingSwitch, LandingSwitchProvider } from './LandingSwitch';

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
