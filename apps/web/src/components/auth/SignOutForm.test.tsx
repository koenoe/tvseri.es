// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import SignOutForm from './SignOutForm';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-signing-out');
});

describe('SignOutForm', () => {
  it('posts to the logout route', () => {
    render(
      <SignOutForm>
        <button type="submit">Sign out</button>
      </SignOutForm>,
    );
    const form = screen
      .getByRole('button', { name: 'Sign out' })
      .closest('form');
    expect(form?.getAttribute('action')).toBe('/api/auth/logout');
    expect(form?.getAttribute('method')).toBe('post');
  });

  it('hides the private page the moment it submits', () => {
    render(
      <SignOutForm>
        <button type="submit">Sign out</button>
      </SignOutForm>,
    );
    expect(document.documentElement.hasAttribute('data-signing-out')).toBe(
      false,
    );
    const form = screen
      .getByRole('button', { name: 'Sign out' })
      .closest('form');
    if (!form) throw new Error('no form');
    fireEvent.submit(form);
    expect(document.documentElement.hasAttribute('data-signing-out')).toBe(
      true,
    );
  });
});
