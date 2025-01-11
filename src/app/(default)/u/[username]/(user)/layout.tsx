import { type ReactNode } from 'react';

import PageDivider from '@/components/Page/Divider';
import Page from '@/components/Page/Page';

export default function Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <PageDivider className="mx-auto pb-20" />
        {children}
      </div>
    </Page>
  );
}
