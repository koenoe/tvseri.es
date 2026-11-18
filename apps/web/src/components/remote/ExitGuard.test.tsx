// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const presence = vi.hoisted(() => ({ present: true }));
vi.mock('motion/react', () => ({ useIsPresent: () => presence.present }));

import ExitGuard from './ExitGuard';

describe('ExitGuard (the Remote while it fades out)', () => {
  it('leaves the keys live while the Remote is open', () => {
    presence.present = true;
    render(
      <ExitGuard>
        <button type="button">Watched next episode</button>
      </ExitGuard>,
    );
    expect(
      screen
        .getByRole('button', { name: 'Watched next episode' })
        .closest('[inert]'),
    ).toBeNull();
  });

  it('makes them inert once it is closing, so a click goes to what is under it', () => {
    presence.present = false;
    const { container } = render(
      <ExitGuard>
        <button type="button">Watched next episode</button>
      </ExitGuard>,
    );
    expect(container.querySelector('[inert] button')).not.toBeNull();
  });
});
