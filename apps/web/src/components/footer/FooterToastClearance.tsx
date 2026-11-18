'use client';

import { clearToastOverFooter } from '@/components/ui/toast/clearToast';

/**
 * Keeps the app's toast above the footer while the footer is in view: the
 * footer stays a server component, this empty island holds the observer.
 */
export default function FooterToastClearance() {
  return <span hidden ref={clearToastOverFooter} />;
}
