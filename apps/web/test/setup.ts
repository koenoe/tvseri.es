import { afterEach } from 'vitest';

// Testing Library only auto-cleans when globals are on; clean up rendered
// trees after each test in jsdom files.
afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
