import './globals.css';

import { cx } from 'class-variance-authority';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';
import { Toaster } from 'sonner';

import EnsureHistoryKey from '@/components/EnsureHistoryKey';
import ScrollbarDetection from '@/components/ScrollbarDetection';
import SessionSync from '@/components/SessionSync';
import WatchedStoreProvider from '@/components/Watched/WatchedStoreProvider';

const inter = Inter({ display: 'swap', subsets: ['latin'] });

export const metadata: Metadata = {
  formatDetection: {
    address: false,
    date: false,
    email: false,
    telephone: false,
    url: false,
  },
  robots: 'noai,noimageai',
  title: {
    default: 'tvseri.es',
    template: '%s – tvseri.es',
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  width: 'device-width',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cx(
          'overflow-x-hidden overscroll-y-none bg-neutral-900 text-white subpixel-antialiased',
          inter.className,
        )}
      >
        <Suspense fallback={null}>
          <SessionSync />
        </Suspense>
        <Toaster
          toastOptions={{
            classNames: {
              description: 'text-neutral-900 fill-current',
              icon: 'text-neutral-900 fill-current',
              title: 'text-neutral-900',
              toast: 'bg-white',
            },
          }}
        />
        <Suspense fallback={null}>
          <EnsureHistoryKey />
        </Suspense>
        <ScrollbarDetection />
        <WatchedStoreProvider>{children}</WatchedStoreProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
