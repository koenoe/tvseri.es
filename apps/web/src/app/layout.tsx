import './globals.css';

import { cx } from 'class-variance-authority';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';
import { Toaster } from 'sonner';

import EnsureHistoryKey from '@/components/EnsureHistoryKey';
import WatchedStoreProvider from '@/components/Watched/WatchedStoreProvider';
import WebVitals from '@/components/WebVitals';

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
        suppressHydrationWarning
      >
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: it's ok
          dangerouslySetInnerHTML={{
            __html: `
              const scrollbarCheck = document.createElement("div");
              scrollbarCheck.style.overflow = "scroll";
              scrollbarCheck.style.width = "10px";
              scrollbarCheck.style.height = "10px";
              scrollbarCheck.style.position = "absolute";
              scrollbarCheck.style.top = "0px";
              scrollbarCheck.style.visibility = "hidden";
              if (document.body) {
                document.body.appendChild(scrollbarCheck);
                if (scrollbarCheck.scrollWidth !== scrollbarCheck.offsetWidth) {
                  document.body.classList.add("scrollbar-is-visible");
                }
                document.body.removeChild(scrollbarCheck);
              }
            `,
          }}
        />
        <Suspense fallback={null}>
          <EnsureHistoryKey />
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
        <WatchedStoreProvider>{children}</WatchedStoreProvider>
        <Suspense fallback={null}>
          <WebVitals />
        </Suspense>
        <div id="modal-root" />
      </body>
    </html>
  );
}
