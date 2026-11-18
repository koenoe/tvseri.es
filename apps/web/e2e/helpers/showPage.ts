import type { Page } from '@playwright/test';

/** The show page's episodes section. */
export const episodes = (page: Page) =>
  page.locator('section[aria-label="Episodes"]');

/** The season select: a select-only combobox showing the season. */
export const seasonSelect = (page: Page) =>
  episodes(page).getByRole('combobox', { exact: true, name: 'Season' });

/** The season line under the select (tap or paint its segments). */
export const seasonLine = (page: Page) =>
  page.locator('[role="group"][aria-keyshortcuts="Enter"]').first();

/** The hero's progress line, which opens the watch history. */
export const progress = (page: Page) =>
  page.getByRole('button', { name: /open watch history/ }).first();
