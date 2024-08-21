import { cookies } from 'next/headers';

import Menu from './Menu';

export default async function MenuContainer({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = !!cookies().get('sessionId')?.value;

  return <Menu isAuthenticated={isAuthenticated}>{children}</Menu>;
}
