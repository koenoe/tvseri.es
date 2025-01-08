import { Suspense } from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
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
