import './globals.css';

import { cx } from 'class-variance-authority';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import EnsureHistoryKey from '@/components/EnsureHistoryKey';
import ScrollbarDetection from '@/components/ScrollbarDetection';
import WatchedStoreProvider from '@/components/Watched/WatchedStoreProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  formatDetection: {
    address: false,
    date: false,
    email: false,
    telephone: false,
    url: false,
  },
  title: {
    template: '%s – tvseri.es',
    default: 'tvseri.es',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#171717',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cx(
          'overflow-x-hidden overscroll-y-none bg-neutral-900 text-white subpixel-antialiased',
          inter.className,
        )}
      >
        <Toaster
          toastOptions={{
            classNames: {
              toast: 'bg-white',
              title: 'text-neutral-900',
              description: 'text-neutral-900 fill-current',
              icon: 'text-neutral-900 fill-current',
            },
          }}
        />
        <EnsureHistoryKey />
        <ScrollbarDetection />
        <WatchedStoreProvider>{children}</WatchedStoreProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
