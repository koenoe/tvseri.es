// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoginButton from './LoginButton';
import NotFoundView from './NotFoundView';
import { NOT_FOUND_STILLS } from './stills';
import UnauthorizedView from './UnauthorizedView';

vi.mock('next/navigation', () => ({
  usePathname: () => '/u/maria/history',
}));

describe('LoginButton', () => {
  it('signs in and comes back to the current path', () => {
    render(<LoginButton />);
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe(
      '/api/auth/login?returnTo=%2Fu%2Fmaria%2Fhistory',
    );
  });

  it('keeps the page’s query once the link is about to be used', () => {
    window.history.replaceState(null, '', '/u/maria/history?year=2025');
    render(<LoginButton />);
    const link = screen.getByRole('link', { name: 'Sign in' });

    fireEvent.focus(link);

    expect(link.getAttribute('href')).toBe(
      '/api/auth/login?returnTo=%2Fu%2Fmaria%2Fhistory%3Fyear%3D2025',
    );
    window.history.replaceState(null, '', '/');
  });
});

describe('NotFoundView', () => {
  it('renders the 404 from its still alone, with no request data', () => {
    const lost = NOT_FOUND_STILLS[0];
    render(<NotFoundView still={lost} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'This page is lost.' }),
    ).toBeTruthy();
    expect(screen.getByText('S04E04')).toBeTruthy();
    expect(screen.getByText('Page not found')).toBeTruthy();
    expect(screen.getByText('Lost · Jack, S03E22')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Home' }).getAttribute('href'),
    ).toBe('/');
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });
});

describe('UnauthorizedView', () => {
  it('asks to sign in and offers going home', () => {
    render(<UnauthorizedView variant="default" />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sign in, so we know your name.',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Not now' }).getAttribute('href'),
    ).toBe('/');
  });

  it('on a profile, links to that user’s public stats', () => {
    render(
      <UnauthorizedView statsYear={2025} username="maria" variant="profile" />,
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sign in to see @maria’s profile.',
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'See @maria’s stats' })
        .getAttribute('href'),
    ).toBe('/u/maria/stats/2025');
  });

  // No dead ends: a new user's empty stats, an unknown handle's 404
  it('on a profile with nothing in its stats, says so without a link', () => {
    render(
      <UnauthorizedView statsYear={null} username="maria" variant="profile" />,
    );
    expect(screen.queryByRole('link', { name: /stats/ })).toBeNull();
    expect(screen.getByText(/@maria has no public stats yet\./)).toBeTruthy();
  });

  it('holds the link’s and the sentence’s space, hidden, while it checks: nothing is claimed yet', () => {
    render(
      <UnauthorizedView
        statsYear={undefined}
        username="maria"
        variant="profile"
      />,
    );
    expect(screen.queryByRole('link', { name: /stats/ })).toBeNull();
    const held = screen.getByText(/stats are public/);
    expect(held.className).toContain('invisible');
    expect(held.getAttribute('aria-hidden')).toBe('true');
  });

  // a handle nobody has (or a failed check) must not be vouched for
  it('claims nothing about a user it could not find', () => {
    render(
      <UnauthorizedView
        statsYear="unknown"
        username="maria"
        variant="profile"
      />,
    );
    expect(screen.queryByRole('link', { name: /stats/ })).toBeNull();
    expect(screen.queryByText(/stats/)).toBeNull();
    expect(
      screen.getByText('Profiles are for members, and joining is free.'),
    ).toBeTruthy();
  });
});
