import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import cn from '@/lib/cn';

// Variable weight + the optical-size axis: above 14px Inter moves towards its
// Display cut by itself, so Inter titles carry no negative tracking.
const inter = Inter({
  axes: ['opsz'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
});

// Page names only (the `display` token), one weight.
const jakarta = Plus_Jakarta_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: '800',
});

/**
 * The font variables for `<html>`: the root layout and `global-error` (which
 * replaces the layout, so it sets them itself).
 */
export const fontVariables = cn(inter.variable, jakarta.variable);
