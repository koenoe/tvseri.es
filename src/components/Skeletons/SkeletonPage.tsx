'use client';

import { useEffect } from 'react';

export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="grow scroll-mt-[6rem] pb-20 pt-[6rem] transition-colors duration-500 md:scroll-mt-[8rem] md:pt-[8rem]">
      {children}
    </main>
  );
}
