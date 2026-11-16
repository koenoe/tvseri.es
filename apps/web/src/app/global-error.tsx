'use client';

import './globals.css';

import type { ErrorInfo } from 'next/error';

import SearchLauncher from '@/components/search/SearchLauncher';
import AppErrorView from '@/components/ui/error/AppErrorView';

import { fontVariables } from './fonts';

/**
 * The root layout failed: the same error page in its own document (it
 * replaces the layout, so it brings the styles, fonts and search itself).
 */
export default function GlobalError({ error, retry }: ErrorInfo) {
  return (
    <html className={fontVariables} lang="en">
      <body>
        <title>Something broke – tvseri.es</title>
        <AppErrorView error={error} retry={retry} />
        {/* the header's search button needs it: the root layout is gone */}
        <SearchLauncher />
      </body>
    </html>
  );
}
