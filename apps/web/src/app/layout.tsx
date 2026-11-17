import './globals.css';

import type { Metadata, Viewport } from 'next';
import { type ReactNode, Suspense } from 'react';

import MotionProvider from '@/components/motion/MotionProvider';
import SearchLauncher from '@/components/search/SearchLauncher';
import { PageEdgeTint } from '@/components/ui/dialog/EdgeTint';
import Toaster from '@/components/ui/toast/Toaster';
import ViewerHintsScript from '@/components/ViewerHintsScript';
import WebVitals from '@/components/WebVitals';
import WelcomeToast from '@/components/WelcomeToast';
import MarkingProvider from '@/lib/marking/MarkingProvider';
import NavigationTracker from '@/lib/navigation/NavigationTracker';
import RouteHints from '@/lib/viewer/RouteHints';

import { fontVariables } from './fonts';

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

// Pinch zoom stays allowed (WCAG 1.4.4); inputs are 16px so iOS doesn't zoom
// on focus.
export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#1c2223',
  width: 'device-width',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // The pre-paint scripts set `data-show-prompt`, `data-stats-year` and
    // `data-region` on <html> before React hydrates (ViewerHintsScript); the
    // flag covers this element's own attributes only, not anything below it.
    <html className={fontVariables} lang="en" suppressHydrationWarning>
      <body>
        <PageEdgeTint />
        <ViewerHintsScript />
        <NavigationTracker />
        <MotionProvider>
          <MarkingProvider>{children}</MarkingProvider>
          <Suspense fallback={null}>
            <RouteHints />
            <WebVitals />
          </Suspense>
          <Toaster />
          <WelcomeToast />
          <SearchLauncher />
        </MotionProvider>
      </body>
    </html>
  );
}
