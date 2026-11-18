'use client';

import { useParams } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { readDisplayUsername } from '@/auth/displayUsername';

import {
  isVisitorOf,
  OWNER_VISITOR_SHEET,
  VISITOR_RULE,
} from './ownerVisitorRule';

type SheetWindow = Window & { [OWNER_VISITOR_SHEET]?: CSSStyleSheet };

/**
 * Keeps the owner/visitor placeholder rule right across client navigations
 * (the pre-paint script only runs on a hard load): before the browser paints
 * the new shell, the rule follows the profile in the URL. Renders nothing.
 */
export default function OwnerVisitorSync() {
  const { username } = useParams<{ username?: string }>();
  useLayoutEffect(() => {
    const page = username ? decodeURIComponent(username) : null;
    const viewer = readDisplayUsername(document.cookie);
    const visitor = page !== null && isVisitorOf(page, viewer);
    const target = window as SheetWindow;
    let sheet = target[OWNER_VISITOR_SHEET];
    if (!sheet) {
      sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      target[OWNER_VISITOR_SHEET] = sheet;
    }
    sheet.replaceSync(visitor ? VISITOR_RULE : '');
  }, [username]);
  return null;
}
