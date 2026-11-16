import { test } from '@playwright/test';

import { enterAhead } from './helpers/search';

/** Enter-ahead (P-SR-5, P-SR-5b) in Safari's engine. */
test('Enter-ahead: Enter while pending opens the first result as soon as it lands', async ({
  page,
}) => {
  await enterAhead(page);
});

test('Enter-ahead shows the page’s shell at once, without waiting for its dynamic render', async ({
  page,
}) => {
  await enterAhead(page, { slowRender: true });
});
