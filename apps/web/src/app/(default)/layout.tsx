import { type ReactNode, Suspense } from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

// Keep the App Shell (header, footer, Suspense fallbacks) static so default
// <Link> prefetches are served from the CDN instead of rendering per session.
export const ensureStatic = 'shell';

export default function Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
      <Suspense>
        <Footer />
      </Suspense>
    </div>
  );
}
