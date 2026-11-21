// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ServicesEditor from './ServicesEditor';

vi.mock('@/lib/watchProviders/actions', () => ({
  updateCountry: vi.fn(async () => ({ ok: true })),
  updateWatchProviders: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/region/useRegion', () => ({
  refreshRegion: vi.fn(async () => undefined),
}));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));

function setup(detected: string | null = 'NL') {
  render(
    <ServicesEditor
      detected={detected}
      initialRegion="GB"
      initialSelected={[]}
      providers={[]}
    />,
  );
  const change = screen.getByRole('button', { name: 'Change' });
  return { change, user: userEvent.setup() };
}

/** Where Change's `aria-controls` points, if anywhere */
const controlled = (button: HTMLElement) => {
  const id = button.getAttribute('aria-controls');
  return id === null ? null : document.getElementById(id);
};

describe('ServicesEditor', () => {
  it('after "Use Netherlands" the strip goes and focus lands on Change', async () => {
    const { change, user } = setup('NL');

    await user.click(screen.getByRole('button', { name: 'Use Netherlands' }));

    expect(document.activeElement).toBe(change);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Use Netherlands' }),
      ).toBeNull(),
    );
  });

  it('Change points only at a country list that is there', async () => {
    const { change, user } = setup(null);
    expect(change.getAttribute('aria-controls')).toBeNull();

    await user.click(change);
    // while the list's code loads there's only its skeleton
    if (change.getAttribute('aria-controls') !== null) {
      expect(controlled(change)).not.toBeNull();
    }
    const dialog = await screen.findByRole('dialog', {
      name: 'Choose your country',
    });
    expect(controlled(change)).toBe(dialog);

    await user.keyboard('{Escape}');
    expect(change.getAttribute('aria-controls')).toBeNull();
  });
});
