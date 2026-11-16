import type { ReactNode } from 'react';

import Footer from '@/components/footer/Footer';
import Header from '@/components/header/Header';

// Keep the App Shell (header, footer, Suspense fallbacks) static so default
// <Link> prefetches are served from the CDN instead of rendering per session.
export const ensureStatic = 'shell';

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
