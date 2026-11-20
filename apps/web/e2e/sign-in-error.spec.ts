import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

import { afterRelease } from './helpers/instantRelease';

/**
 * A sign-in that fails on our side (“Sign-in broke”): the
 * callback never answers with JSON; it sends the visitor to the static
 * S05E00 page with Try again back to where the login was going, or (Google
 * cancel / no verified email) restarts the login with a notice.
 */

test.describe('sign-in errors', () => {
  test('the “Sign-in broke” page is static, and Try again keeps the return path', async ({
    baseURL,
    page,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/sign-in/error?returnTo=%2Fu%2Fmargaux');
        await expect(
          page.getByRole('heading', { name: 'Sign-in broke on our side.' }),
        ).toBeVisible();
        await expect(page.getByText('Something broke')).toBeVisible();
        await expect(
          page.getByRole('link', { exact: true, name: 'Home' }),
        ).toBeVisible();
      },
      { baseURL },
    );
    await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/api/auth/login?returnTo=%2Fu%2Fmargaux',
      { timeout: afterRelease() },
    );
  });

  test('an outside return path is dropped', async ({ page }) => {
    await page.goto('/sign-in/error?returnTo=%2F%2Fevil.example.com');
    await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/api/auth/login?returnTo=%2F',
    );
  });

  test('the callback sends a failure there and a Google cancel back to sign-in', async ({
    request,
  }) => {
    const failed = await request.get(
      '/api/auth/callback?error=server_error&error_description=x',
      { maxRedirects: 0 },
    );
    expect(failed.status()).toBe(302);
    expect(failed.headers().location).toBe('/sign-in/error');

    const cancelled = await request.get(
      '/api/auth/callback?error=access_denied',
      { maxRedirects: 0 },
    );
    expect(cancelled.status()).toBe(302);
    const restart = new URL(cancelled.headers().location ?? '');
    expect(restart.pathname).toBe('/authorize');
    expect(restart.searchParams.get('notice')).toBe('google_cancelled');
  });
});
