import type { ReactNode } from 'react';

import Page from '@/components/Page/Page';

export default async function TrackLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Page backgroundContext="dots">
      <div className="container">{children}</div>
    </Page>
  );
}
