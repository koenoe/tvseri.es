import Pills from '../Tabs/Pills';

export default async function UserPills({
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
}>) {
  const { username } = await params;
  const year = new Date().getFullYear();

  const menuItems = [
    // {
    //   label: 'Profile',
    //   href: `/u/${username}`,
    // },
    {
      href: `/u/${username}/in-progress`,
      label: 'In progress',
    },
    {
      href: `/u/${username}/finished`,
      label: 'Finished',
    },
    {
      href: `/u/${username}/watchlist`,
      label: 'Watchlist',
    },
    {
      href: `/u/${username}/favorites`,
      label: 'Favorites',
    },
    {
      href: `/u/${username}/social`,
      label: 'Social',
    },
    {
      href: `/u/${username}/stats/${year}`,
      label: 'Stats',
    },
  ] as const;

  return <Pills className="w-full" items={menuItems} layoutId="profile" />;
}
