import './globals.css';

import { Suspense } from 'react';

import { cx } from 'class-variance-authority';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

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
    template: 'tvseri.es - %s',
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
          'flex min-h-screen select-none flex-col overflow-x-hidden overscroll-y-none bg-neutral-900 text-white subpixel-antialiased',
          inter.className,
        )}
      >
        <script
          id="history-state-key"
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              var orgPushState = window.history.pushState;
              var orgReplaceState = window.history.replaceState;

              function ensureStateKey(state) {
                if (!state || !state.key) {
                    var key = Math.random().toString(32).slice(2);
                    state = state || {};
                    state.key = key;
                }
                return state;
              }

              window.history.pushState = function (state, unused, url) {
                state = ensureStateKey(state);
                orgPushState.call(window.history, state, unused, url);
              };

              window.history.replaceState = function (state, unused, url) {
                state = ensureStateKey(state);
                orgReplaceState.call(window.history, state, unused, url);
              };
            `,
          }}
        />
        <script
          id="scrollbar-detector"
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              const scrollable = document.createElement("div");
              scrollable.style.overflow = "scroll";
              scrollable.style.width = "10px";
              scrollable.style.height = "10px";
              scrollable.style.position = "absolute";
              scrollable.style.top = "0px";
              scrollable.style.visibility = "hidden";
              if (document.body) {
                document.body.appendChild(scrollable);
                if (scrollable.scrollWidth !== scrollable.offsetWidth) {
                  document.body.classList.add("scrollbar-is-visible");
                }
                document.body.removeChild(scrollable);
              }
            `,
          }}
        />
        <Header />
        {children}
        <Suspense>
          <Footer />
        </Suspense>
        <div id="modal-root" />
      </body>
    </html>
  );
}
