import { type ReactNode, Suspense } from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

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
