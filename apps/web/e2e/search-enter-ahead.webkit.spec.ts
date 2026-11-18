import { test } from '@playwright/test';

import { enterAhead } from './helpers/search';

/** Enter-ahead in Safari's engine. */
test('Enter-ahead: Enter while pending opens the first result as soon as it lands', async ({
  page,
}) => {
  await enterAhead(page);
});
