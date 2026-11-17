import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';

/**
 * The sign-in pages on the harness: every flow and error, with
 * and without JavaScript, by keyboard, and the page-level guarantees (one
 * origin, a CSP that holds, no horizontal scroll on phones).
 */

let counter = 0;
const address = (name: string) =>
  `${name}-${test.info().project.name}-${Date.now().toString(36)}${counter++}@example.com`;

async function codeFor(request: APIRequestContext, email: string) {
  await expect
    .poll(async () =>
      (
        await request.get(`/__test/mail?to=${encodeURIComponent(email)}`)
      ).status(),
    )
    .toBe(200);
  const mail = await (
    await request.get(`/__test/mail?to=${encodeURIComponent(email)}`)
  ).json();
  return (mail.subject as string).slice(-6);
}

const wrongOf = (code: string) => (code === '111111' ? '222222' : '111111');

async function requestCode(page: Page, email: string) {
  await page.goto('/start');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  return codeFor(page.request, email);
}

test.describe('email code', () => {
  test('request → code page → wrong code → resend → right code → the site', async ({
    page,
  }) => {
    const email = address('ana');
    const first = await requestCode(page, email);

    await expect(
      page.getByText(`Enter the code we sent to ${email}.`),
    ).toBeVisible();
    const field = page.getByLabel('6-digit code');
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(field).toHaveAttribute('inputmode', 'numeric');
    // Password managers keep their icon off the slots
    await expect(field).toHaveAttribute('data-1p-ignore', 'true');
    // The button's name is the label that shows, not its hidden states
    await expect(page.locator('#cf .a-btn')).toHaveAccessibleName('Sign in');
    // The resend cooldown runs from the send
    await expect(page.locator('#res-in')).toContainText(/0:(30|29|28)/);

    // Wrong: shown in place, digits kept and drawn selected, announced;
    // the field itself is empty, so the next code starts fresh
    await field.pressSequentially(wrongOf(first));
    await expect(page.getByRole('alert')).toHaveText(
      'That code isn’t right. Check the newest email from tvseri.es.',
    );
    await expect(page).toHaveTitle('Error: Check your email · tvseri.es');
    await expect(page.locator('.a-otp .a-sl b')).toHaveText([
      ...wrongOf(first),
    ]);
    await expect(page.locator('.a-otp')).toHaveClass(/sel/);
    await expect(page.getByLabel('6-digit code')).toHaveValue('');

    // Resend (past the cooldown): confirmation and a fresh cooldown
    await page
      .locator('#rsb')
      .evaluate((b) => b.removeAttribute('aria-disabled'));
    await page.getByRole('button', { name: 'resend the code' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'New code sent.' }),
    ).toBeVisible();
    await expect(page.locator('#res-in')).toBeVisible();

    // Right: paste the line from the newest email; it submits itself
    const code = await codeFor(page.request, email);
    await page
      .getByLabel('6-digit code')
      .fill(`Your code: ${code.slice(0, 3)} ${code.slice(3)}`);
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
    const query = JSON.parse(
      (await page.locator('#query').textContent()) ?? '{}',
    );
    expect(query.code?.[0]).toBeTruthy();
    expect(query.state).toEqual(['state-1']);
  });

  test('after a wrong code, a click on a slot and the new code: no mixed digits, no burnt try', async ({
    page,
  }) => {
    const email = address('dora');
    const code = await requestCode(page, email);
    const field = page.getByLabel('6-digit code');
    await field.pressSequentially(wrongOf(code));
    await expect(page.locator('[data-state=wrong]')).toBeVisible();

    // The natural “let me retype” gesture: a click on the 3rd slot
    const input = await field.boundingBox();
    const third = await page.locator('.a-sl').nth(2).boundingBox();
    if (!input || !third) throw new Error('no layout');
    await field.click({
      position: {
        x: third.x - input.x + third.width / 2,
        y: third.y - input.y + third.height / 2,
      },
    });
    // Five new digits: nothing is sent yet, and only new digits show
    await page.keyboard.type(code.slice(0, 5));
    await expect(page.locator('[data-state=typing]')).toBeVisible();
    await expect(field).toHaveValue(code.slice(0, 5));
    await expect(page.locator('.a-otp .a-sl.f')).toHaveCount(5);
    await page.keyboard.type(code.slice(5));
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
  });

  test('after a wrong code, a pasted code replaces the whole value', async ({
    page,
  }) => {
    const email = address('emil');
    const code = await requestCode(page, email);
    const field = page.getByLabel('6-digit code');
    await field.pressSequentially(wrongOf(code));
    await expect(page.locator('[data-state=wrong]')).toBeVisible();
    await field.click();
    await page.keyboard.insertText(`${code.slice(0, 3)} ${code.slice(3)}`);
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
  });

  test('Change puts the address back, selected, so a typo is one retype away', async ({
    page,
  }) => {
    const typo = address('gus').replace('@example.com', '@exmaple.com');
    await requestCode(page, typo);
    await page.getByRole('button', { name: 'Change' }).click();

    const field = page.getByLabel('Email', { exact: true });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(field).toHaveValue(typo);
    await expect(field).toBeFocused();
    // Selected: typing replaces the whole address
    const email = address('gus');
    await page.keyboard.type(email);
    await expect(field).toHaveValue(email);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(
      page.getByText(`Enter the code we sent to ${email}.`),
    ).toBeVisible();
  });

  test('shows “Signed in · taking you back” before it leaves', async ({
    page,
  }) => {
    const email = address('ben');
    const code = await requestCode(page, email);
    // The real answer is the site's callback; then hold the page
    await page.route('**/code/authorize', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      expect(new URL(body.next).pathname).toBe('/api/auth/callback');
      // Stay on the page to look at it: the CSP refuses a javascript: URL
      await route.fulfill({ json: { next: 'javascript:void 0' }, response });
    });
    await page.getByLabel('6-digit code').fill(code);
    await expect(
      page.getByRole('button', { name: 'Signed in · taking you back' }),
    ).toBeVisible();
  });

  test('turns into “Send a new code” on the 5th wrong try', async ({
    page,
  }) => {
    const email = address('cleo');
    const code = await requestCode(page, email);
    for (let i = 0; i < 4; i++) {
      await page.getByLabel('6-digit code').fill(wrongOf(code));
      await expect(page.locator('[data-state=wrong]')).toBeVisible();
    }
    // The 5th used the code up: no invitation to a 6th try
    await page.getByLabel('6-digit code').fill(wrongOf(code));
    await expect(page.getByText('This code has expired.')).toBeVisible();
    await expect(page.getByText('That code isn’t right.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Send a new code' }).click();
    await expect(page.getByText('New code sent.')).toBeVisible();
  });
});

test.describe('start page errors', () => {
  test('checks the address inline, before posting', async ({ page }) => {
    await page.goto('/start');
    const field = page.getByLabel('Email', { exact: true });
    await field.fill('ana@example');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'That doesn’t look like an email address. Check for a typo.',
    );
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/authorize/);
  });

  // A failed send and the hourly cap answer the same way (`send_failed`)
  test('when email can’t be sent, leads with Google, which signs in', async ({
    page,
  }) => {
    await page.goto('/start');
    await page.getByLabel('Email', { exact: true }).fill('down@example.com');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Email codes are unavailable right now. Continue with Google to sign in now, or try email again later.',
    );
    const google = page.getByRole('link', { name: 'Continue with Google' });
    await expect(google).toBeFocused();
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      'down@example.com',
    );

    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Continue as Ana' }).click();
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
  });

  test('stops at 5 codes in 15 minutes', async ({ page }) => {
    const email = address('dora');
    await page.goto('/start');
    // A script's post carries no Origin of its own: send the page's, as the
    // form would (the code form refuses posts from other origins)
    const origin = new URL(page.url()).origin;
    for (let i = 0; i < 5; i++) {
      await page.request.post('/code/authorize', {
        form: { action: 'request', email, verify_email: '' },
        headers: { origin },
      });
    }
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Email codes for this address are paused for 15 minutes. Continue with Google to sign in now.',
    );
    await expect(
      page.getByRole('link', { name: 'Continue with Google' }),
    ).toBeFocused();
  });

  test('takes more providers as a 2-column grid with short names', async ({
    page,
  }) => {
    await page.goto('/__test/start-4');
    // Google first, then the issuer's order (the fixture's, here)
    const links = page.locator('.a-grid').getByRole('link');
    await expect(links).toHaveText(['Google', 'Apple', 'Discord', 'GitHub'], {
      useInnerText: true,
    });
    const tops = await links.evaluateAll((all) =>
      all.map((link) => link.getBoundingClientRect().top),
    );
    expect(tops[0]).toBe(tops[1]);
    expect(tops[2]).toBeGreaterThan(tops[0] ?? 0);
    await expect(
      page.getByRole('button', { name: 'Email me a code' }),
    ).toBeVisible();
  });

  test('ignores a notice it doesn’t know', async ({ page }) => {
    await page.goto('/start?notice=%3Cb%3Eaccount%20locked%3C%2Fb%3E');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('account locked')).toHaveCount(0);
    await expect(page.locator('.a-note')).toHaveCount(0);
  });
});

test.describe('Google', () => {
  test('goes to Google and comes back to the site with a code', async ({
    page,
  }) => {
    await page.goto('/start');
    await page.getByRole('link', { name: 'Continue with Google' }).click();
    await page.getByRole('button', { name: 'Continue as Ana' }).click();
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
    expect(
      JSON.parse((await page.locator('#query').textContent()) ?? '{}')
        .code?.[0],
    ).toBeTruthy();
  });

  test('a cancel lands on the start page with one line', async ({ page }) => {
    await page.goto('/start');
    await page.getByRole('link', { name: 'Continue with Google' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Google sign-in was cancelled. Try again, or get a code by email.',
    );
  });

  test('an account without a verified email is sent to the email field', async ({
    page,
  }) => {
    await page.goto('/start');
    await page.getByRole('link', { name: 'Continue with Google' }).click();
    await page.getByRole('button', { name: 'Unverified account' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Your Google account has no verified email.',
    );
    await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  });
});

test.describe('lost state', () => {
  test('a sign-in this browser can’t find gets the S04E00 page, with a way forward', async ({
    context,
    page,
  }) => {
    await page.goto('/start');
    await context.clearCookies();
    await page.getByLabel('Email', { exact: true }).fill('eve@example.com');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(
      page.getByRole('heading', { name: 'Start your sign-in again.' }),
    ).toBeVisible();
    await expect(page.getByText('S04E00')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sign in again' }),
    ).toHaveAttribute('href', /\/site\/api\/auth\/login$/);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every step is a plain form post', async ({ page }) => {
    const email = address('finn');
    await page.goto('/start');
    // The server checks the address
    await page.getByLabel('Email', { exact: true }).fill('finn@example');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'That doesn’t look like an email address.',
    );
    await expect(page).toHaveTitle('Error: Sign in · tvseri.es');

    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    const code = await codeFor(page.request, email);
    // One wide field, no slots
    await expect(page.getByLabel('6-digit code')).toBeVisible();
    await expect(page.locator('.a-sl').first()).toBeHidden();

    await page.getByLabel('6-digit code').fill(wrongOf(code));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'That code isn’t right.',
    );

    // The server keeps only the digits of a pasted code
    await page
      .getByLabel('6-digit code')
      .fill(`${code.slice(0, 3)}-${code.slice(3)}`);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: 'Site callback' }),
    ).toBeVisible();
  });
});

test.describe('the page itself', () => {
  test('the header is the website bar: its logo where the website puts it', async ({
    page,
  }) => {
    test.skip(test.info().project.name === 'phone', 'desktop header');
    await page.goto('/start');
    const logo = await page.locator('.a-logo svg').evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      return { height: box.height, left: box.left, top: box.top };
    });
    // the 1280px page container at 1440, its gutter, 32px down, 24px tall
    expect(logo).toEqual({ height: 24, left: 112, top: 32 });
  });

  test('loads nothing from another origin and breaks no CSP rule', async ({
    page,
  }) => {
    const outside: string[] = [];
    const violations: string[] = [];
    page.on('request', (req) => {
      if (
        !req.url().startsWith('http://localhost') &&
        !req.url().startsWith('data:')
      ) {
        outside.push(req.url());
      }
    });
    page.on('console', (msg) => {
      if (/Content Security Policy|Refused to/i.test(msg.text()))
        violations.push(msg.text());
    });
    const email = address('gus');
    await requestCode(page, email);
    await page.getByLabel('6-digit code').fill('1');
    await page.goto('/start');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.fonts.check('600 32px Inter')),
    ).toBe(true);
    expect(outside).toEqual([]);
    expect(violations).toEqual([]);
  });

  test('works by keyboard alone, in the board’s focus order', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'Safari tabs to links only with its own setting',
    );
    await page.goto('/start');
    const order: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      // the visible text, as a user reads it (textContent also holds hidden text)
      const [visible = ''] = await focused.allInnerTexts();
      order.push(
        (await focused.getAttribute('aria-label')) ||
          (await focused.getAttribute('id')) ||
          visible.trim(),
      );
    }
    expect(order).toEqual([
      'tvseri.es home',
      'Not now',
      'Continue with Google',
      'em',
      'Email me a code',
    ]);
  });

  test('fits a phone: no sideways scroll, 32px gutters like the website, 16px fields', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'phone', 'phone layout');
    await page.goto('/start');
    const metrics = await page.evaluate(() => ({
      field: getComputedStyle(document.querySelector('#em') as Element)
        .fontSize,
      left: document.querySelector('.a-col')?.getBoundingClientRect().left,
      // the website's phone bar: a 20px logo, centred 32px from the top
      logo: (() => {
        const box = document
          .querySelector('.a-logo svg')
          ?.getBoundingClientRect();
        return box
          ? { height: box.height, middle: box.top + box.height / 2 }
          : null;
      })(),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(metrics).toEqual({
      field: '16px',
      left: 32,
      logo: { height: 20, middle: 32 },
      overflow: 0,
    });
  });
});
