import { type ReactNode } from 'react';

import Page from '@/components/Page/Page';
import Tabs from '@/components/Tabs/Tabs';

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ username: string }>;
}>) {
  const { username } = await params;

  const menuItems = [
    // {
    //   label: 'Profile',
    //   href: `/u/${username}/profile`,
    // },
    {
      label: 'Watched',
      href: `/u/${username}/watched`,
    },
    {
      label: 'Watchlist',
      href: `/u/${username}/watchlist`,
    },
    {
      label: 'Favorites',
      href: `/u/${username}/favorites`,
    },
    {
      label: 'Stats',
      href: `/u/${username}/stats/${new Date().getFullYear()}`,
    },
  ] as const;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <Tabs items={menuItems} className="mb-10" layoutId="profile" />
        {children}
      </div>
    </Page>
  );
}
