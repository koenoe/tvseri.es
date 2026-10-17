import { unstable_rethrow } from 'next/navigation';
import { toast } from 'sonner';

import { login } from '@/app/actions';

/**
 * Starts the login flow and returns to the current page afterwards. The path
 * is read from the address bar on click, so it is the page the visitor asked
 * for, also when the proxy rewrote it to the login prompt.
 */
export async function loginFromHere() {
  try {
    await login(`${window.location.pathname}${window.location.search}`);
  } catch (error) {
    // `login` always ends in `redirect()`, which rejects the action promise
    // with a Next.js redirect error. Let Next handle that navigation.
    unstable_rethrow(error);
    toast.error('Something went wrong. Please try again.');
  }
}
