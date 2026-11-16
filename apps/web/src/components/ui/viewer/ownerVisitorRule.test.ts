import { describe, expect, it } from 'vitest';

import {
  applyOwnerVisitor,
  isVisitorOf,
  OWNER_VISITOR_SHEET,
  VISITOR_RULE,
} from './ownerVisitorRule';

/** Runs the pre-paint rule for a page and a viewer; returns the rule it set, or null */
function run(pathname: string, viewer: string | null): string | null {
  const win: Record<string, unknown> = {};
  const sheet = (css: string) => ({ css }) as unknown as CSSStyleSheet;
  applyOwnerVisitor(
    pathname,
    viewer,
    sheet,
    VISITOR_RULE,
    OWNER_VISITOR_SHEET,
    win,
  );
  const made = win[OWNER_VISITOR_SHEET] as { css: string } | undefined;
  return made ? made.css : null;
}

describe('isVisitorOf', () => {
  it('is false when signed out or on your own profile, whatever the case', () => {
    expect(isVisitorOf('alex', null)).toBe(false);
    expect(isVisitorOf('Alex', 'alex')).toBe(false);
  });

  it('is true on someone else’s profile', () => {
    expect(isVisitorOf('juno', 'alex')).toBe(true);
  });
});

describe('the pre-paint script', () => {
  it('turns the visitor rule on for someone else’s profile', () => {
    expect(run('/u/juno/history', 'alex')).toBe(VISITOR_RULE);
  });

  it('leaves the owner’s placeholders on your own profile', () => {
    expect(run('/u/alex', 'alex')).toBeNull();
    expect(run('/u/Alex', 'alex')).toBeNull();
    expect(run('/u/%C3%A9lo', 'élo')).toBeNull();
  });

  it('does nothing off a profile or signed out', () => {
    expect(run('/discover', 'alex')).toBeNull();
    expect(run('/u/juno', null)).toBeNull();
  });
});
