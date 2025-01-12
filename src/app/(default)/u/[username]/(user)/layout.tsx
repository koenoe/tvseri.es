import { type ReactNode } from 'react';

import Page from '@/components/Page/Page';
import Pills from '@/components/Tabs/Pills';

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
      label: 'In progress',
      href: `/u/${username}/in-progress`,
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
        <div className="relative mb-10 w-full">
          <Pills items={menuItems} layoutId="profile" className="w-full" />
        </div>
        {children}
      </div>
    </Page>
  );
}
